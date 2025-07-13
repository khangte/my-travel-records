from sqlalchemy.orm import Session
from models import Board, BoardImg, User
from sqlalchemy import func, distinct

from . import board_schema
from domain.map.district_mapper import kor_to_eng

def create_board(db: Session, board_data: board_schema.BoardCreate, user_num: int):
    """ 게시글 생성 - 이미지 제외 """
    # create_board()에서 board와 image를 한꺼번에 처리 → SRP 위반
    # User를 찾을 때 .id 대신 .user_num을 사용합니다.
    user = db.query(User).filter(User.user_num == user_num).first()
    if not user:
        raise ValueError("해당 유저를 찾을 수 없습니다.")

    district_code = kor_to_eng.get(board_data.location)
    if district_code is None:
        raise ValueError(f"알 수 없는 구 이름입니다: {board_data.location}")

    db_board = Board(
        user_num=user.user_num,
        title=board_data.title,
        district_code=district_code,
    )
    db.add(db_board)
    db.commit()
    db.refresh(db_board)
    return db_board

def save_board_image(db: Session, board_id: int, image_url: str) -> None:
    """ 게시글 이미지 저장 """
    db_image = BoardImg(board_id=board_id, img_url=image_url)
    db.add(db_image)
    db.commit()

# 마이페이지 조회구문
def get_boards_by_user(db: Session, user_num: int):
    return db.query(Board).filter(Board.user_num == user_num).order_by(Board.writer_date.desc()).all()


# 조회 및 삭제 구현
def get_board(db: Session, board_id: int):
    return db.query(Board).filter(Board.board_id == board_id).first()

def delete_board(db: Session, board: Board):
    db.delete(board)
    db.commit()

# 사용자의 전체 게시글 수를 세는 함수
def count_user_boards(db: Session, user_num: int) -> int:
    # Board 테이블에서 user_num이 일치하는 레코드의 개수를 센다.
    return db.query(Board).filter(Board.user_num == user_num).count()

def count_unique_user_districts(db: Session, user_num: int) -> int:
    # Board 테이블에서 user_num이 일치하는 레코드 중
    # district_code 컬럼의 중복을 제거한 개수를 센다.
    return db.query(func.count(distinct(Board.district_code))).filter(Board.user_num == user_num).scalar()
