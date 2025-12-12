### 怎麼開
---
1. 進 Terminal，確保環境有 python3
2. 用 uv 的話：`uv pip install -r requirements.txt`
3. 用 pip 的話：`pip install -r requirements.txt`
4. 在目錄下執行：`python3 -m http.server 8889`
5. 如果環境是 ssh 到 ubuntu server，瀏覽器的網址是：`http://ubuntu_host_ip:8889`
6. 環境是本地，瀏覽器的網址是：`http://localhost:8889`

### 什麼東西是幹嘛的
---
```
.
├── css/
│   └── index.html 的 css file
├── data/
│   └── processed/
│       ├── comparison_data.json: 趨勢比較用的資料
│       ├── grid_viz_data_xxxx.json: 地理分佈圖用到的資料，讓網格抓行政區裡受試者資料用的
│       └── wealth_data_xxxx.json: 某年度受試者的主觀、客觀財富統計
├── js/
│   ├── 各個頁面的邏輯
│   ├── main.js
│   ├── comparison.js
│   ├── geographical.js
│   ├── heatmap.js
│   └── sankey.js
├── map/
│   ├── 直轄市、縣、市（COUNTY）和鄉鎮市區（TOWN）層級的經緯度資料
│   └── GEO 結尾的沒用到
├── vi_data/
│   └── 各年度實際資料
├── CLAUDE.md
├── README.md
├── DATA_PROCESSING_NOTES.md
├── Visualization Final.md: 記錄開發規格和過程
├── index.html: 網站入口
├── requirements.txt
├── prepare_grid_visualization_data.py: 處理地理資料腳本
└── prepare_wealth_data.py: 處理主客觀財富資料腳本
```
### 路徑問題
---
資料處理腳本裡面讀資料的路徑，可能跟你本地端的不一樣，請檢查