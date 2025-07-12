import os
import shutil
import uuid  # ✨ 파일 이름 중복 방지를 위해 uuid 라이브러리를 사용합니다.
from fastapi import APIRouter, Depends, Form, File, UploadFile, HTTPException
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from starlette import status

from database import get_db
from models import User
from domain.user.user_auth import get_current_user # ✨ get_current_user 경로 수정
from . import board_crud, board_schema

router = APIRouter(
    prefix="/api/board",
    tags=["Board"]
)

# ✨ mypage_router와 동일하게, 어디서 실행하든 정확한 경로를 가리키도록 절대 경로로 설정합니다.
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT_DIR = os.path.join(BASE_DIR, "..", "..", "..", "..")
UPLOAD_DIRECTORY = os.path.join(PROJECT_ROOT_DIR, "uploads", "boards")

os.makedirs(UPLOAD_DIRECTORY, exist_ok=True)  # 업로드 폴더 미리 생성

@router.post("/create")
def board_create(
    db: Session = Depends(get_db),
    title: str = Form(...),
    location: str = Form(...),
    image: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    
    # ✨ 파일 이름이 중복되지 않도록 고유한 ID를 붙여줍니다.
    unique_filename = f"{uuid.uuid4()}-{image.filename}"
    file_path = os.path.join(UPLOAD_DIRECTORY, unique_filename)

    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(image.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail="이미지 저장 실패")

    # ✨ DB에 저장될 URL 경로를 실제 저장 위치에 맞게 수정합니다.
    image_url = f"/uploads/boards/{unique_filename}"

    # 게시글 생성
    board_data = board_schema.BoardCreate(title=title, location=location)

    try:
        board = board_crud.create_board(db=db, board_data=board_data, image_url=image_url, user_num=current_user.user_num)
        board_crud.save_board_image(db=db, board_id=board.board_id, image_url=image_url)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

    return RedirectResponse(url="/map.html", status_code=status.HTTP_303_SEE_OTHER)

@router.get("/me", response_model=list[board_schema.Board])
def get_my_boards(
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user)
):
    return board_crud.get_boards_by_user(db=db, user_num=current_user.user_num)


@router.delete("/delete/{board_id}", status_code=status.HTTP_204_NO_CONTENT)
def board_delete(
    board_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    board = board_crud.get_board(db, board_id=board_id)
    if not board:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="게시물을 찾을 수 없습니다.")

    if board.user_num != current_user.user_num:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="게시물을 삭제할 권한이 없습니다.")

    if board.images:
        # ✨ 업로드 폴더에 저장된 이미지 파일을 삭제하도록 로직을 수정/확인합니다.
        # URL 경로에서 파일 이름만 추출
        file_name = os.path.basename(board.images[0].img_url)
        # 절대 경로로 변환
        file_path = os.path.join(UPLOAD_DIRECTORY, file_name)
        
        if os.path.exists(file_path):
            os.remove(file_path)

    board_crud.delete_board(db=db, board=board)
    return
