import os
import shutil
import uuid  # ✨ 파일 이름 중복 방지를 위해 uuid 라이브러리를 사용합니다.
from fastapi import APIRouter, Depends, Form, File, UploadFile, HTTPException
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from starlette import status

from database import get_db
from models import User
from domain.user.user_auth import get_current_user  # 현재 로그인한 유저 정보를 가져오는 의존성
from . import board_crud, board_schema

# 라우터 설정
router = APIRouter(
    prefix="/api/board",
    tags=["Board"]
)

# 어디서 실행하든 절대 경로로 프로젝트 루트를 계산
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT_DIR = os.path.join(BASE_DIR, "..", "..", "..", "..")

@router.post("/create")
def board_create(
    db: Session = Depends(get_db),                         # DB 세션 의존성 주입
    title: str = Form(...),                                # 폼에서 입력받는 게시글 제목
    district_code: str = Form(...),                        # 폼에서 입력받는 구 이름
    image: UploadFile = File(...),                         # 업로드한 이미지 파일
    current_user: User = Depends(get_current_user)         # 현재 로그인한 유저 정보
):
    # 사용자 업로드 디렉토리 생성 (예: uploads/user_1)
    user_dir = f"user_{current_user.user_num}"
    upload_dir = os.path.join(PROJECT_ROOT_DIR, "uploads", user_dir)
    os.makedirs(upload_dir, exist_ok=True)

    # 파일 이름 중복 방지를 위해 UUID를 파일 이름에 추가
    unique_filename = f"{uuid.uuid4()}-{image.filename}"
    file_path = os.path.join(upload_dir, unique_filename)

    # 파일 저장
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(image.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail="이미지 저장 실패")

    # 저장된 이미지의 URL 경로 생성 (→ 프론트에서 이미지 표시 시 사용)
    image_url = f"/uploads/{user_dir}/{unique_filename}"

    # 게시글 생성용 데이터 구성
    board_data = board_schema.BoardCreate(title=title, location=district_code)

    try:
        # 게시글 DB에 저장
        board = board_crud.create_board(
            db=db,
            board_data=board_data,
            user_num=current_user.user_num
        )

        # 이미지 DB에 저장
        board_crud.save_board_image(
            db=db,
            board_id=board.board_id,
            image_url=image_url
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

    # 성공 후 map 페이지로 리다이렉트
    return RedirectResponse(url="/map.html", status_code=status.HTTP_303_SEE_OTHER)

@router.get("/me", response_model=list[board_schema.Board])
def get_my_boards(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    현재 로그인한 사용자의 게시글 전체 조회 (마이페이지용)
    """
    return board_crud.get_boards_by_user(db=db, user_num=current_user.user_num)

@router.delete("/delete/{board_id}", status_code=status.HTTP_204_NO_CONTENT)
def board_delete(
    board_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    게시글 삭제
    - 게시글 작성자만 삭제 가능
    - 업로드된 이미지 파일도 삭제
    """
    board = board_crud.get_board(db, board_id=board_id)

    if not board:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="게시물을 찾을 수 없습니다.")

    if board.user_num != current_user.user_num:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="게시물을 삭제할 권한이 없습니다.")

    # 업로드 디렉토리 경로 설정
    user_dir = f"user_{current_user.user_num}"
    upload_dir = os.path.join(PROJECT_ROOT_DIR, "uploads", user_dir)

    if board.images:
        # 이미지 URL에서 파일 이름 추출 후 파일 삭제
        file_name = os.path.basename(board.images[0].img_url)
        file_path = os.path.join(upload_dir, file_name)

        if os.path.exists(file_path):
            os.remove(file_path)

    # 게시글 + 이미지 DB에서 삭제
    board_crud.delete_board(db=db, board=board)