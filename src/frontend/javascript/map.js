const mapContainer = document.getElementById('mapContainer');
const svgNS = "http://www.w3.org/2000/svg";

let currentImages = [];
let currentIndex = 0;

function updateViewer(districtName, images) {
  currentImages = images;
  currentIndex = 0;

  document.getElementById('districtName').innerText = districtName;
  updateImage();
}

function updateImage() {
  const imgEl = document.getElementById('viewerImage');
  const noImageText = document.getElementById('noImageText');

  if (currentImages.length > 0) {
    const image = currentImages[currentIndex];
    imgEl.style.display = "block";
    imgEl.src = image.img_url;
    imgEl.alt = '게시글 이미지';
    noImageText.style.display = "none";
  } else {
    imgEl.style.display = "none";
    imgEl.src = '';
    imgEl.alt = '이미지가 없습니다';
    noImageText.style.display = "block";
  }
}

function prevImage() {
  if (currentImages.length === 0) return;
  currentIndex = (currentIndex - 1 + currentImages.length) % currentImages.length;
  updateImage();
}

function nextImage() {
  if (currentImages.length === 0) return;
  currentIndex = (currentIndex + 1) % currentImages.length;
  updateImage();
}

function showDistrictClipImage(svg, item, latestImage) {
  const clipId = "clip-" + item.id;

  // 기존 clipPath 제거
  const oldClipPath = document.getElementById(clipId);
  if (oldClipPath) oldClipPath.remove();

  // clipPath 생성
  const clipPath = document.createElementNS(svgNS, "clipPath");
  clipPath.setAttribute("id", clipId);

  const clipShape = document.createElementNS(svgNS, "path");
  clipShape.setAttribute("d", item.d);
  clipPath.appendChild(clipShape);

  let defs = svg.querySelector("defs");
  if (!defs) {
    defs = document.createElementNS(svgNS, "defs");
    svg.insertBefore(defs, svg.firstChild);
  }
  defs.appendChild(clipPath);

  // 이미지 생성
  const image = document.createElementNS(svgNS, "image");
  image.setAttribute("id", `clipImage-${item.id}`);
  image.setAttributeNS("http://www.w3.org/1999/xlink", "xlink:href", latestImage.img_url);

  // path 요소의 bounding box를 가져와 이미지 크기와 위치 설정
  const pathElement = svg.querySelector(`#${item.id}`);
  const bbox = pathElement.getBBox(); // path의 bounding box를 구함

  // path의 bounding box에 맞춰서 이미지 크기 조정
  const width = bbox.width;
  const height = bbox.height;
  const x = bbox.x;
  const y = bbox.y;

  // 이미지 크기와 위치를 path에 맞게 설정
  image.setAttribute("width", width);
  image.setAttribute("height", height);
  image.setAttribute("x", x);  // 이미지의 x 위치를 path의 x 위치에 맞게 설정
  image.setAttribute("y", y);  // 이미지의 y 위치를 path의 y 위치에 맞게 설정
  image.setAttribute("preserveAspectRatio", "xMidYMid slice");  // 비율을 유지하면서 크기 조정
  image.setAttribute("clip-path", `url(#${clipId})`);
  image.style.pointerEvents = "none";  // <-- 핵심: 클릭 막기

  svg.appendChild(image);
}

function fetchAndShowAllDistrictImages(svg, data) {
  const token = localStorage.getItem("access_token");

  const promises = data.map(item => {
    const districtId = item.id.toLowerCase();

    return fetch(`/api/districts/${districtId}/image`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`
      }
    })
    .then(res => res.ok ? res.json() : null)
    .then(latestImages => {
      if (latestImages && latestImages.length > 0) {
        showDistrictClipImage(svg, item, latestImages[0]);
      }
    })
    .catch(err => {
      console.error(`구역 ${item.id} 이미지 로드 실패`, err);
    });
  });

  return Promise.all(promises);
}

function fetchImagesForViewer(item) {
  const token = localStorage.getItem("access_token");
  const districtId = item.id.toLowerCase();

  const allImagesPromise = fetch(`/api/districts/${districtId}/images`, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${token}`
    }
  }).then(res => res.ok ? res.json() : []);

  const latestImagePromise = fetch(`/api/districts/${districtId}/image`, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${token}`
    }
  }).then(res => res.ok ? res.json() : []);

  Promise.all([allImagesPromise, latestImagePromise])
    .then(([allImages, latestImages]) => {
      const combined = [...new Set([...latestImages, ...allImages])];
      updateViewer(item.display_name, combined);
    })
    .catch(err => {
      console.error("이미지 뷰어 로드 실패:", err);
      updateViewer(item.display_name, []);
    });
}

fetch('/api/districts')
  .then(res => {
    if (!res.ok) throw new Error("서버 응답 오류");
    return res.json();
  })
  .then(data => {
    if (!Array.isArray(data) || data.length === 0) {
      mapContainer.textContent = "지도 데이터가 없습니다.";
      return;
    }

    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("viewBox", "0 0 1500 1500");
    svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
    svg.style.width = "100%";
    svg.style.height = "100%";

    mapContainer.appendChild(svg);

    // path는 image 위에 오게 나중에 추가
    const pathGroup = document.createElementNS(svgNS, "g");

    data.forEach(item => {
      const path = document.createElementNS(svgNS, "path");
      path.setAttribute("id", item.id);
      path.setAttribute("d", item.d);
      path.setAttribute("fill", item.color || "#ccc");
      path.setAttribute("stroke", "#333");
      path.setAttribute("stroke-width", "1");
      path.style.cursor = "pointer";

      const title = document.createElementNS(svgNS, "title");
      title.textContent = item.display_name;
      path.appendChild(title);

      path.addEventListener("click", () => {
        fetchImagesForViewer(item);
      });

      pathGroup.appendChild(path);
    });

    svg.appendChild(pathGroup);  // path는 항상 제일 위에 있도록 마지막에 append

    // 모든 구역 이미지 표시
    fetchAndShowAllDistrictImages(svg, data)
      .then(() => {
        if (data.length > 0) {
          fetchImagesForViewer(data[0]);
        }
      });

    console.log("지도 삽입 및 이미지 렌더링 완료");
  })
  .catch(err => {
    console.error("지도 로드 실패:", err);
    mapContainer.textContent = "지도를 불러오는 데 실패했습니다.";
  });

document.addEventListener("DOMContentLoaded", () => {
  const logoutBtn = document.querySelector('.nav .nav-btn[href="/logout"]');
  if (logoutBtn) {
    logoutBtn.addEventListener("click", (e) => {
      e.preventDefault();
      localStorage.removeItem("access_token");
      localStorage.removeItem("username");
      localStorage.setItem("is_login", "false");
      window.location.href = "/index.html";
    });
  }

  const homeBtn = document.querySelector('.home-button');
  if (homeBtn) {
    homeBtn.addEventListener("click", () => {
      window.location.href = "/board.html";
    });
  }
});
