from pydantic import BaseModel
from datetime import datetime

# 게시글 이미지 정보를 담는 스키마 (BoardImg 테이블에 해당)
class BoardImg(BaseModel):
    img_url: str  # 이미지 경로 (정적 파일 경로 형식)

    class Config:
        # SQLAlchemy 모델로부터 데이터를 받아올 수 있도록 설정
        from_attributes = True

# 게시글 전체 정보를 반환할 때 사용하는 스키마
class Board(BaseModel):
    board_id: int             # 게시글 고유 ID
    title: str                # 게시글 제목
    writer_date: datetime     # 게시글 작성 시각
    update_date: datetime     # 게시글 수정 시각
    images: list[BoardImg] = []  # 게시글에 연결된 이미지 리스트

    class Config:
        # ORM 모델에서 직접 값을 가져올 수 있도록 설정
        from_attributes = True

# 게시글 생성 요청 시 사용하는 스키마 (입력용)
class BoardCreate(BaseModel):
    title: str     # 게시글 제목
    location: str  # 게시글 작성 위치 (자치구 이름)
