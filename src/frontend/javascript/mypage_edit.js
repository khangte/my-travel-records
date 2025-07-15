document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('access_token');
    if (!token) {
        alert('로그인이 필요합니다.');
        window.location.href = '/login.html';
        return;
    }

    const idInputElement = document.getElementById("user-id");
    const passwordInputElement = document.getElementById("password");
    const birthDateInputElement = document.getElementById("birth-date");
    const registerDateInputElement = document.getElementById("register-date");
    const saveBtn = document.querySelector(".edit-btn");
    const cancelBtn = document.querySelector(".cancel-btn");

    // 사용자 프로필 불러오기
    async function loadProfileData() {
        try {
            const response = await fetch('/api/mypage/profile', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) {
                throw new Error('프로필 정보를 불러오지 못했습니다.');
            }

            const data = await response.json();

            // 닉네임 입력창은 비워두되 placeholder로 기존 ID 표시
            // const displayName = data.nickname || data.id;
            idInputElement.value = "";
            idInputElement.defaultValue = "";
            // idInputElement.placeholder = displayName;
            idInputElement.placeholder = data.id
            console.log("API에서 받은 프로필:", data);


            if (data.birth) {
                birthDateInputElement.value = new Date(data.birth).toISOString().split('T')[0];
            }

            if (data.register_date) {
                const formattedDate = new Date(data.register_date).toLocaleDateString('ko-KR');
                registerDateInputElement.value = formattedDate;
            }
        } catch (error) {
            console.error('프로필 로딩 오류:', error);
            alert(error.message);
        }
    }

    // 아이디 중복 확인
    const checkBtn = document.querySelector('.check-btn');
    checkBtn.addEventListener('click', async () => {
        const userid = idInputElement.value.trim();
        if (!userid) {
            alert('ID을 입력해주세요.');
            return;
        }

        const validPattern = /^[a-zA-Z0-9]+$/;
        if (!validPattern.test(userid)) {
            alert('영어, 숫자만 입력 가능합니다.');
            return;
        }

        try {
            const response = await fetch(`/api/user/check-id?id=${encodeURIComponent(userid)}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('중복 확인 실패');
            }

            const data = await response.json();
            if (data.available) {
                alert('사용 가능한 ID입니다.');
            } else {
                alert('이미 사용 중인 ID입니다.');
            }
        } catch (error) {
            console.error('ID 확인 오류:', error);
            alert('ID 중복 확인 중 오류가 발생했습니다.');
        }
    });

    // 저장 버튼 클릭 시 수정 요청
    saveBtn.addEventListener("click", async () => {
        const nickname = idInputElement.value.trim() || idInputElement.placeholder;

        const updatedData = {
            id: nickname,
            pw: passwordInputElement.value.trim() || null,
            birth: birthDateInputElement.value || null
        };

        Object.keys(updatedData).forEach((key) => {
            if (!updatedData[key]) {
                delete updatedData[key];
            }
        });

        console.log("📤 서버에 보낼 데이터:", updatedData);

        try {
            const response = await fetch("/api/mypage/profile", {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify(updatedData)
            });

            console.log("📥 응답 상태코드:", response.status);
            console.log("📥 응답 헤더:", [...response.headers.entries()]);

            let data = {};
            try {
                data = await response.json();
                console.log("📥 응답 본문(JSON):", data);
            } catch (e) {
                console.warn("⚠️ 응답 본문 없음 (response.json() 실패)");
            }

            if (!response.ok) {
                alert(data.detail || "정보 수정 실패");
                return;
            }

            if (data.access_token) {
                localStorage.setItem("access_token", data.access_token);
            }

            alert("정보가 성공적으로 수정되었습니다.");
            window.location.href = "/mypage.html";

        } catch (error) {
            console.error("💥 정보 수정 중 오류 발생:", error);
            alert("정보 수정 요청 실패");
        }
    });


    // 취소 버튼: 이전 페이지로
    cancelBtn.addEventListener('click', () => {
        window.history.back();
    });

    // 로그아웃 버튼
    const logoutBtn = document.querySelector('.nav .nav-btn[href="/logout"]');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.removeItem('access_token');
            localStorage.removeItem('username');
            localStorage.setItem('is_login', 'false');
            alert('로그아웃 되었습니다.');
            window.location.href = '/index.html';
        });
    }

    // 초기 데이터 로딩
    loadProfileData();
});
