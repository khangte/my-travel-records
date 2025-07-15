document.addEventListener('DOMContentLoaded', function() {
    const cancelbtn = document.querySelector('.cancel-btn');
    if(cancelbtn){
        cancelbtn.addEventListener("click", () => {
            window.location.href="/map.html";
        })
    }


    // --- 1. 제어할 요소들을 모두 가져옵니다 ---
    const boardForm = document.getElementById('board-form');
    const imageUploadWrapper = document.querySelector('.image-upload-wrapper');
    const imageInput = document.getElementById('imageInput');
    const previewImage = document.getElementById('previewImage');
    const deleteImageButton = document.getElementById('deleteImage');
    const defaultIconPath = '/static/images/CAMERAICON.png'; 

    //////////////////////////////////////////////////
    // 추가된 부분
    const districtNameToCode = {
        '강남구': 'gangnam-gu',
        '강동구': 'gangdong-gu',
        '강북구': 'gangbuk-gu',
        '강서구': 'gangseo-gu',
        '관악구': 'gwanak-gu',
        '광진구': 'gwangjin-gu',
        '구로구': 'guro-gu',
        '금천구': 'geumcheon-gu',
        '노원구': 'nowon-gu',
        '도봉구': 'dobong-gu',
        '동대문구': 'dongdaemun-gu',
        '동작구': 'dongjak-gu',
        '마포구': 'mapo-gu',
        '서대문구': 'seodaemun-gu',
        '서초구': 'seocho-gu',
        '성동구': 'seongdong-gu',
        '성북구': 'seongbuk-gu',
        '송파구': 'songpa-gu',
        '양천구': 'yangcheon-gu',
        '영등포구': 'yeongdeungpo-gu',
        '용산구': 'yongsan-gu',
        '은평구': 'eunpyeong-gu',
        '종로구': 'jongno-gu',
        '중구': 'jung-gu',
        '중랑구': 'jungnang-gu'
    };

    // --- 자치구 선택
    const locationSelect = document.getElementById('location');

    fetch('/api/districts')
      .then(response => {
          if (!response.ok) throw new Error('자치구 목록 로딩 실패');
          return response.json();
      })
      .then(districts => {
          districts.forEach(district => {
              const option = document.createElement('option');
              option.value = district.code;
              option.textContent = district.display_name;
              locationSelect.appendChild(option);
          });
      })
      .catch(error => console.error('자치구 목록 로딩 오류:', error));

    // --- 날짜 입력 및 선택
    const dateInput = document.getElementById('date');

    // 오늘 날짜 (yyyy-mm-dd 형식으로)
    function getTodayDateString() {
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    }

    // 날짜가 미래면 오늘로 바꾸는 함수
    function correctFutureDate() {
        const selected = new Date(dateInput.value);
        const today = new Date(getTodayDateString());

        if (selected > today) {
            dateInput.value = getTodayDateString();
        }
    }

    // 날짜 선택 후 포커스 잃을 때 확인
    dateInput.addEventListener('blur', function () {
        correctFutureDate();
    });

    // 수동으로 날짜 선택할 때도 반영
    dateInput.addEventListener('change', function () {
        correctFutureDate();
    });
    //////////////////////////////////////////////////

    // --- 2. 이미지 미리보기 관련 기능 ---
    imageUploadWrapper.addEventListener('click', function(event) {
        if (event.target !== deleteImageButton) {
            imageInput.click();
        }
    });

    imageInput.addEventListener('change', function(event) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                previewImage.src = e.target.result;
                deleteImageButton.style.display = 'block';
                imageUploadWrapper.classList.add('uploaded');
            }
            reader.readAsDataURL(file);
        }
    });

    deleteImageButton.addEventListener('click', function() {
        previewImage.src = defaultIconPath;
        imageInput.value = ''; 
        deleteImageButton.style.display = 'none';
        imageUploadWrapper.classList.remove('uploaded');
    });


    // --- 3. 폼 제출 관련 기능 ---
    boardForm.addEventListener('submit', function(event) {
        // 기본 폼 제출(새로고침) 동작을 막습니다.
        event.preventDefault();

        const token = localStorage.getItem('access_token');
        const submitButton = boardForm.querySelector('button[type="submit"]');
        if (!token) {
            alert('로그인이 필요합니다.');
            window.location.href = '/login.html';
            return;
        }
        const file = imageInput.files[0];

        if (!file) {
            alert('이미지를 업로드해야 합니다.');
            submitButton.disabled = false;
            submitButton.textContent = 'Post';
            return;
        }

        const formData = new FormData(boardForm);
        console.log("📝 FormData 전체:", [...formData.entries()]);
        console.log("📍 선택한 location:", formData.get("location"));
        console.log("📌 선택한 title:", formData.get("title"));
        console.log("📆 선택한 date:", formData.get("date"));
        console.log("🖼️ 이미지 파일:", formData.get("image"));

        // 한글 자치구 → 영문 district_code 변환
        const selectedDistrictName = formData.get("district_code");
        const code = districtNameToCode[selectedDistrictName];
        if (!code) {
            alert("선택한 자치구의 코드 변환에 실패했습니다.");
            return;
        }
        formData.set("district_code", code);

        // [개선] 버튼을 비활성화해서 중복 제출을 막습니다.
        submitButton.disabled = true;
        submitButton.textContent = 'Posting...';

        fetch('/api/board/create', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        })
        .then(response => {
            // 서버 응답이 리다이렉션일 경우, 해당 주소로 페이지를 이동시킵니다.
            if (response.redirected) {
                window.location.href = response.url;
                return; // 리다이렉션 후에는 더 이상 처리하지 않음
            }
            
            // 응답이 실패(2xx 상태코드가 아님)했을 경우
            if (!response.ok) {
                // JSON 형태의 에러 메시지를 파싱해서 Promise.reject로 에러를 넘깁니다.
                return response.json().then(errorData => Promise.reject(errorData));
            }
            
            // 성공적인 응답 처리 (예: 성공 메시지 후 페이지 이동)
            // 성공 후 이동할 페이지가 있다면 여기에 추가
            // window.location.href = '/board/list.html'; 
            return response.json(); // 성공 데이터를 다음 .then()으로 넘길 수 있음
        })
        .catch(error => {
            // Promise.reject로 넘어온 에러 또는 네트워크 에러를 여기서 처리합니다.
            console.error('게시글 작성 중 오류 발생:', error);
            alert(error.detail || '게시글 작성 중 오류가 발생했습니다.');
        })
        .finally(() => {
            // 성공/실패 여부와 관계없이 버튼을 다시 활성화 시킵니다.
            submitButton.disabled = false;
            submitButton.textContent = 'Post';
        }); 
    }); 
}); 