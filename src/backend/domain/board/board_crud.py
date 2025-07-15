from sqlalchemy.orm import Session
from models import Board, BoardImg, User
from sqlalchemy import func, distinct
from . import board_schema
from domain.map.district_mapper import kor_to_eng

def create_board(db: Session, board_data: board_schema.BoardCreate, user_num: int):
    """
    게시글 생성 함수 (이미지 제외)
    - user_num에 해당하는 유저 확인
    - 한글 구명을 영문 district_code로 변환
    - Board 객체를 생성하여 DB에 저장
    """
    user = db.query(User).filter(User.user_num == user_num).first()
    if not user:
        raise ValueError("해당 유저를 찾을 수 없습니다.")

    # location(한글 구 이름) → district_code(영문 ID)로 변환
    district_code = kor_to_eng.get(board_data.location)
    print("📍 변환 시도한 location:", board_data.location)

    if district_code is None:
        raise ValueError(f"알 수 없는 구 이름입니다: {board_data.location}")

    # 게시글 객체 생성
    db_board = Board(
        user_num=user.user_num,
        title=board_data.title,
        district_code=district_code,
    )
    db.add(db_board)
    db.commit()
    db.refresh(db_board)  # 생성된 board_id 값을 가져오기 위해 refresh
    return db_board

def save_board_image(db: Session, board_id: int, image_url: str) -> None:
    """
    게시글 이미지 저장 함수
    - board_id에 해당하는 게시글에 이미지 경로를 저장
    """
    db_image = BoardImg(board_id=board_id, img_url=image_url)
    db.add(db_image)
    db.commit()

def get_boards_by_user(db: Session, user_num: int):
    """
    특정 유저의 게시글 목록 반환 (작성일 기준 내림차순 정렬)
    """
    return db.query(Board).filter(Board.user_num == user_num).order_by(Board.writer_date.desc()).all()

def get_board(db: Session, board_id: int):
    """
    특정 board_id에 해당하는 게시글 반환
    """
    return db.query(Board).filter(Board.board_id == board_id).first()

def delete_board(db: Session, board: Board):
    """
    게시글 삭제 함수
    """
    db.delete(board)
    db.commit()

def count_user_boards(db: Session, user_num: int) -> int:
    """
    사용자의 전체 게시글 수 반환
    """
    return db.query(Board).filter(Board.user_num == user_num).count()

def count_unique_user_districts(db: Session, user_num: int) -> int:
    """
    사용자가 게시글을 작성한 서로 다른 자치구 개수 반환
    (district_code 중복 제거 후 카운트)
    """
    return db.query(func.count(distinct(Board.district_code))).filter(Board.user_num == user_num).scalar()
