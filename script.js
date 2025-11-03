document.addEventListener("DOMContentLoaded", () => {
  const currentYearEl = document.getElementById("currentYear");
  const currentMonthEl = document.getElementById("currentMonth");
  const datesContainer = document.getElementById("datesContainer");

  let today = new Date();
  let currentYear = today.getFullYear();
  let currentMonth = today.getMonth(); // 0-11

  // カスタムラベル関連の要素
  const itemDefinitionTitleEl = document.getElementById("itemDefinitionTitle");
  const item1LabelEl = document.getElementById("item1Label");
  const item2LabelEl = document.getElementById("item2Label");
  const saveLabelsBtn = document.getElementById("saveLabelsBtn");

  let customLabels = {
    itemDefinition: "アイテム定義",
    item1: "アイテム1",
    item2: "アイテム2",
  };

  // アイテム定義関連の要素
  const item1DefinitionEl = document.getElementById("item1Definition");
  const item2DefinitionEl = document.getElementById("item2Definition");
  const saveItemDefinitionsBtn = document.getElementById("saveItemDefinitions");

  let itemDefinitions = { item1: [], item2: [] };

  // テキスト書き出し期間選択の要素
  const exportScopeRadios = document.querySelectorAll(
    'input[name="exportScope"]'
  );
  let currentExportScope = "month"; // デフォルトは月単位

  exportScopeRadios.forEach((radio) => {
    radio.addEventListener("change", (e) => {
      currentExportScope = e.target.value;
      console.log("Export scope set to:", currentExportScope);
    });
  });

  // デバウンス関数
  function debounce(func, delay) {
    let timeout;
    return function (...args) {
      const context = this;
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(context, args), delay);
    };
  }

  // 自動保存関数
  function autoSaveLabelsAndItems() {
    customLabels.itemDefinition = itemDefinitionTitleEl.textContent;
    customLabels.item1 = item1LabelEl.textContent;
    customLabels.item2 = item2LabelEl.textContent;
    localStorage.setItem("customLabels", JSON.stringify(customLabels));

    itemDefinitions.item1 = item1DefinitionEl.value
      .split(",")
      .map((item) => item.trim())
      .filter((item) => item !== "");
    itemDefinitions.item2 = item2DefinitionEl.value
      .split(",")
      .map((item) => item.trim())
      .filter((item) => item !== "");
    localStorage.setItem("itemDefinitions", JSON.stringify(itemDefinitions));
    console.log("ラベルとアイテム定義を自動保存しました。");
  }

  const debouncedAutoSave = debounce(autoSaveLabelsAndItems, 1000); // 1秒のデバウンス

  function loadCustomLabels() {
    const savedLabels = localStorage.getItem("customLabels");
    if (savedLabels) {
      customLabels = JSON.parse(savedLabels);
      itemDefinitionTitleEl.textContent = customLabels.itemDefinition;
      item1LabelEl.textContent = customLabels.item1;
      item2LabelEl.textContent = customLabels.item2;
    }
  }

  function loadItemDefinitions() {
    const savedDefinitions = localStorage.getItem("itemDefinitions");
    if (savedDefinitions) {
      try {
        const parsed = JSON.parse(savedDefinitions);
        // item1とitem2プロパティが存在し、かつ配列であることを確認
        if (
          parsed &&
          Array.isArray(parsed.item1) &&
          Array.isArray(parsed.item2)
        ) {
          itemDefinitions = parsed;
        } else {
          console.warn(
            "Invalid itemDefinitions structure in localStorage. Resetting to default."
          );
          itemDefinitions = { item1: [], item2: [] }; // デフォルト構造にリセット
        }
      } catch (e) {
        console.error("Error parsing itemDefinitions from localStorage:", e);
        itemDefinitions = { item1: [], item2: [] }; // パースエラー時もデフォルト構造にリセット
      }
    }
    // 読み込んだ（またはリセットした）itemDefinitionsに基づいてテキストエリアを更新
    item1DefinitionEl.value = itemDefinitions.item1.join(",");
    item2DefinitionEl.value = itemDefinitions.item2.join(",");
  }

  // イベントリスナーの追加
  itemDefinitionTitleEl.addEventListener("input", debouncedAutoSave);
  item1LabelEl.addEventListener("input", debouncedAutoSave);
  item2LabelEl.addEventListener("input", debouncedAutoSave);
  item1DefinitionEl.addEventListener("input", debouncedAutoSave);
  item2DefinitionEl.addEventListener("input", debouncedAutoSave);

  // 初期ロード
  loadItemDefinitions();
  loadCustomLabels(); // カスタムラベルもロード

  // サービスワーカーの登録
  if ('serviceWorker' in navigator) {
      console.log('Service Worker API supported.');
      window.addEventListener('load', () => {
          console.log('Attempting to register service worker...');
          navigator.serviceWorker.register('./service-worker.js') // 相対パスに変更
              .then((registration) => {
                  console.log('ServiceWorker registration successful with scope: ', registration.scope);
                  
                  // 新しいservice-workerが利用可能な場合、即座に更新を適用
                  registration.addEventListener('updatefound', () => {
                      const newWorker = registration.installing;
                      newWorker.addEventListener('statechange', () => {
                          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                              // 新しいservice-workerがインストールされた場合、ページをリロードして適用
                              console.log('New service worker installed, reloading page...');
                              window.location.reload();
                          }
                      });
                  });
                  
                  // 定期的に更新をチェック
                  setInterval(() => {
                      registration.update();
                  }, 60000); // 60秒ごとに更新をチェック
              }, (err) => {
                  console.error('ServiceWorker registration failed: ', err);
              });
      });
  } else {
      console.warn('Service Worker API not supported in this browser.');
  }

  // テキストファイル書き出し関連の要素
  const exportToTextBtn = document.getElementById("exportToTextBtn");

  function getAllCalendarDataForTextExport(scope) {
    let textData = "";

    // アイテム定義
    textData += `### ${customLabels.itemDefinition} ###\n`;
    textData += `${customLabels.item1}: ${itemDefinitions.item1.join(", ")}\n`;
    textData += `${customLabels.item2}: ${itemDefinitions.item2.join(
      ", "
    )}\n\n`;

    textData += "### 各日付のアイテム ###\n";
    let dateKeys = Object.keys(localStorage).filter((key) =>
      key.match(/^\d{4}-\d{1,2}-\d{1,2}$/)
    );

    const now = new Date();
    const currentYearFilter = now.getFullYear();
    const currentMonthFilter = now.getMonth() + 1;

    if (scope === "month") {
      dateKeys = dateKeys.filter((key) => {
        const [year, month] = key.split("-");
        return (
          parseInt(year) === currentYearFilter &&
          parseInt(month) === currentMonthFilter
        );
      });
    } else if (scope === "year") {
      dateKeys = dateKeys.filter((key) => {
        const [year] = key.split("-");
        return parseInt(year) === currentYearFilter;
      });
    }

    dateKeys.sort((a, b) => new Date(a).getTime() - new Date(b).getTime()); // 日付でソート

    dateKeys.forEach((key) => {
      try {
        const savedDataForDate = JSON.parse(localStorage.getItem(key));
        const items = savedDataForDate.items || { item1: [], item2: [] };
        const location = savedDataForDate.location || "";
        const time = savedDataForDate.time || "";

        const [year, month, day] = key.split("-");
        textData += `\n${year}年${month}月${day}日:\n`;

        if (location) {
          textData += `  場所: ${location}\n`;
        }
        const item1Text = items.item1.filter((item) => item !== "").join(", ");
        const item2Text = items.item2.filter((item) => item !== "").join(", ");

        if (item1Text) {
          textData += `  ${customLabels.item1}: ${item1Text}\n`;
        }
        if (item2Text) {
          textData += `  ${customLabels.item2}: ${item2Text}\n`;
        }
        if (time) {
          textData += `  時間: ${time}\n`;
        }
        if (!item1Text && !item2Text && !location && !time) {
          textData += `  アイテムなし\n`;
        }
      } catch (e) {
        console.error(`Error parsing localStorage key ${key}:`, e);
      }
    });

    return textData;
  }

  // IndexedDBの設定
  const DB_NAME = 'calendar_files_db';
  const DB_VERSION = 1;
  const STORE_NAME = 'files';

  function openDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const objectStore = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
          objectStore.createIndex('fileName', 'fileName', { unique: false });
          objectStore.createIndex('date', 'date', { unique: false });
        }
      };
    });
  }

  async function saveFileToDB(fileName, fileContent) {
    const db = await openDB();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    const fileData = {
      fileName: fileName,
      content: fileContent,
      date: new Date().toISOString(),
      displayDate: new Date().toLocaleString('ja-JP')
    };

    return new Promise((resolve, reject) => {
      const request = store.add(fileData);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async function getAllFilesFromDB() {
    const db = await openDB();
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index('date');

    return new Promise((resolve, reject) => {
      const request = index.openCursor(null, 'prev'); // 新しい順に
      const files = [];
      
      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          files.push(cursor.value);
          cursor.continue();
        } else {
          resolve(files);
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  async function deleteFileFromDB(id) {
    const db = await openDB();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async function exportToTextFile() {
    const textData = getAllCalendarDataForTextExport(currentExportScope);
    const blob = new Blob([textData], { type: "text/plain" });
    
    let fileName = "calendar_data";
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");

    if (currentExportScope === "month") {
      fileName += `_${year}-${month}`;
    } else if (currentExportScope === "year") {
      fileName += `_${year}`;
    }
    fileName += ".txt";

    // IndexedDBに保存
    try {
      await saveFileToDB(fileName, textData);
      console.log('ファイルをIndexedDBに保存しました');
    } catch (error) {
      console.error('IndexedDBへの保存に失敗しました:', error);
    }

    // ダウンロードも実行（PCブラウザ向け）
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    // ファイル一覧を更新（モーダルが開いている場合）
    if (filesModal.style.display === 'flex') {
      await displayFilesList();
    }
  }

  exportToTextBtn.addEventListener("click", exportToTextFile);

  // アイテム定義エリアの表示/非表示切り替え
  const toggleItemDefinitionBtn = document.getElementById("toggleItemDefinitionBtn");
  const itemDefinitionArea = document.getElementById("itemDefinitionArea");

  toggleItemDefinitionBtn.addEventListener("click", () => {
    const isVisible = itemDefinitionArea.style.display !== "none";
    if (isVisible) {
      itemDefinitionArea.style.display = "none";
      toggleItemDefinitionBtn.textContent = "データ記入";
    } else {
      itemDefinitionArea.style.display = "block";
      toggleItemDefinitionBtn.textContent = "データ記入を閉じる";
    }
  });

  // データ保存エリアの表示/非表示切り替え
  const toggleDataSaveBtn = document.getElementById("toggleDataSaveBtn");
  const dataSaveArea = document.getElementById("dataSaveArea");

  toggleDataSaveBtn.addEventListener("click", () => {
    const isVisible = dataSaveArea.style.display !== "none";
    if (isVisible) {
      dataSaveArea.style.display = "none";
      toggleDataSaveBtn.textContent = "データ保存";
    } else {
      dataSaveArea.style.display = "flex";
      toggleDataSaveBtn.textContent = "データ保存を閉じる";
    }
  });

  // モーダル関連の要素
  const itemSelectionModal = document.getElementById("itemSelectionModal");
  const closeButton = itemSelectionModal.querySelector(".close-button");
  const modalDateEl = document.getElementById("modalDate");
  const item1SelectsContainer = document.getElementById("item1Selects");
  const item2SelectsContainer = document.getElementById("item2Selects");
  const saveSelectionBtn = document.getElementById("saveSelection");
  const cancelSelectionBtn = document.getElementById("cancelSelection");

  let selectedDate = null;
  let currentSelectedItems = { item1: [], item2: [] };
  let initialSelectedItems = { item1: [], item2: [] }; // キャンセル用に初期値を保持

  function openModal(year, month, day) {
    selectedDate = `${year}-${month}-${day}`;
    modalDateEl.textContent = `${year}年${month}月${day}日`;

    // モーダル内のラベルを更新
    // nth-childのインデックスがずれているため修正
    const item1ModalLabel = itemSelectionModal.querySelector(
      ".item-selection-section:nth-child(1) h3"
    );
    if (item1ModalLabel) {
      item1ModalLabel.textContent = customLabels.item1;
    }
    const item2ModalLabel = itemSelectionModal.querySelector(
      ".item-selection-section:nth-child(2) h3"
    );
    if (item2ModalLabel) {
      item2ModalLabel.textContent = customLabels.item2;
    }

    item1SelectsContainer.innerHTML = "";
    item2SelectsContainer.innerHTML = "";

    // 既存の選択肢をロード
    const savedItemsForDate = JSON.parse(
      localStorage.getItem(selectedDate)
    ) || { item1: [], item2: [] };
    currentSelectedItems = { ...savedItemsForDate };
    initialSelectedItems = { ...savedItemsForDate };

    // プルダウンの数を定義されたアイテム数か、最大10個の少ない方に合わせる
    const maxSelectsItem1 = Math.min(itemDefinitions.item1.length, 10);
    const maxSelectsItem2 = Math.min(itemDefinitions.item2.length, 10);

    for (let i = 0; i < maxSelectsItem1; i++) {
      createSelectElement(
        "item1",
        item1SelectsContainer,
        itemDefinitions.item1,
        currentSelectedItems.item1[i]
      );
    }
    for (let i = 0; i < maxSelectsItem2; i++) {
      createSelectElement(
        "item2",
        item2SelectsContainer,
        itemDefinitions.item2,
        currentSelectedItems.item2[i]
      );
    }

    itemSelectionModal.style.display = "flex";
  }

  function closeModal() {
    itemSelectionModal.style.display = "none";
  }

  function createSelectElement(itemType, container, options, selectedValue) {
    const select = document.createElement("select");
    const defaultOption = document.createElement("option");
    defaultOption.value = "";
    defaultOption.textContent = "選択してください";
    select.appendChild(defaultOption);

    options.forEach((option) => {
      const opt = document.createElement("option");
      opt.value = option;
      opt.textContent = option;
      if (option === selectedValue) {
        opt.selected = true;
      }
      select.appendChild(opt);
    });

    select.addEventListener("change", (e) => {
      const index = Array.from(container.children).indexOf(e.target);
      currentSelectedItems[itemType][index] = e.target.value;
    });

    container.appendChild(select);
  }

  closeButton.addEventListener("click", closeModal);
  // モーダル外をクリックで閉じる
  window.addEventListener("click", (e) => {
    if (e.target === itemSelectionModal) {
      closeModal();
    }
  });

  saveSelectionBtn.addEventListener("click", () => {
    const dataToSave = JSON.parse(localStorage.getItem(selectedDate)) || {};
    dataToSave.items = currentSelectedItems;
    localStorage.setItem(selectedDate, JSON.stringify(dataToSave));
    displaySelectedItemsForDate(selectedDate, currentSelectedItems);
    closeModal();
  });

  cancelSelectionBtn.addEventListener("click", () => {
    // 変更を破棄してモーダルを閉じる
    currentSelectedItems = { ...initialSelectedItems };
    closeModal();
  });

  function displaySelectedItemsForDate(dateString, items) {
    // itemsがundefinedまたはnullの場合に備えてデフォルト値を設定
    items = items || { item1: [], item2: [] };

    const [year, month, day] = dateString.split("-");
    const displayAreaId = `item-display-${year}-${month}-${day}`;
    const displayArea = document.getElementById(displayAreaId);
    if (displayArea) {
      // items-containerを探す（なければ作成）
      let itemsContainer = displayArea.querySelector(".items-container");
      if (!itemsContainer) {
        itemsContainer = document.createElement("div");
        itemsContainer.classList.add("items-container");
        // location-time-containerの前に挿入
        const locationTimeContainer = displayArea.querySelector(".location-time-container");
        if (locationTimeContainer) {
          displayArea.insertBefore(itemsContainer, locationTimeContainer);
        } else {
          displayArea.appendChild(itemsContainer);
        }
      }
      
      itemsContainer.innerHTML = ""; // クリア
      const item1Text = items.item1.filter((item) => item !== "").join(", ");
      const item2Text = items.item2.filter((item) => item !== "").join(", ");

      if (item1Text) {
        const p = document.createElement("p");
        p.textContent = `${customLabels.item1}: ${item1Text}`;
        itemsContainer.appendChild(p);
      }
      if (item2Text) {
        const p = document.createElement("p");
        p.textContent = `${customLabels.item2}: ${item2Text}`;
        itemsContainer.appendChild(p);
      }
      if (!item1Text && !item2Text) {
        itemsContainer.textContent = "アイテムなし";
      }
    }
  }

  function renderCalendar() {
    currentYearEl.textContent = `${currentYear}年`;
    currentMonthEl.textContent = `${currentMonth + 1}月`;
    datesContainer.innerHTML = ""; // クリア

    const lastDay = new Date(currentYear, currentMonth + 1, 0).getDate();
    const todayDate = new Date();
    const isCurrentMonth =
      currentYear === todayDate.getFullYear() &&
      currentMonth === todayDate.getMonth();

    for (let i = 1; i <= lastDay; i++) {
      const dateRow = document.createElement("div");
      dateRow.classList.add("date-row");

      const dateEl = document.createElement("div");
      dateEl.classList.add("date");
      dateEl.textContent = i;
      dateEl.dataset.year = currentYear;
      dateEl.dataset.month = currentMonth + 1;
      dateEl.dataset.day = i;
      dateEl.title = "クリックしてアイテムを設定"; // ツールチップを追加

      if (isCurrentMonth && i === todayDate.getDate()) {
        dateEl.classList.add("today"); // 今日の日付にクラスを追加
      }

      dateEl.addEventListener("click", (e) => {
        openModal(
          parseInt(e.target.dataset.year),
          parseInt(e.target.dataset.month),
          parseInt(e.target.dataset.day)
        );
      });
      dateRow.appendChild(dateEl);

      const itemDisplayArea = document.createElement("div");
      itemDisplayArea.classList.add("item-display-area");
      itemDisplayArea.id = `item-display-${currentYear}-${
        currentMonth + 1
      }-${i}`;
      
      // アイテム表示部分（上段）
      const itemsContainer = document.createElement("div");
      itemsContainer.classList.add("items-container");
      itemDisplayArea.appendChild(itemsContainer);
      
      // 場所と時間のコンテナ（下段）
      const locationTimeContainer = document.createElement("div");
      locationTimeContainer.classList.add("location-time-container");
      
      // 場所入力エリアの追加
      const locationArea = document.createElement("div");
      locationArea.classList.add("location-area");
      const locationLabel = document.createElement("label");
      locationLabel.textContent = "場所:";
      locationArea.appendChild(locationLabel);
      const locationInput = document.createElement("textarea");
      locationInput.classList.add("location-input");
      locationInput.id = `location-${currentYear}-${currentMonth + 1}-${i}`;
      locationInput.placeholder = "場所を入力";
      locationArea.appendChild(locationInput);
      locationTimeContainer.appendChild(locationArea);

      // 時間入力エリアの追加
      const timeArea = document.createElement("div");
      timeArea.classList.add("time-area");
      const timeLabel = document.createElement("label");
      timeLabel.textContent = "時間:";
      timeArea.appendChild(timeLabel);
      const timeInput = document.createElement("input");
      timeInput.type = "time";
      timeInput.classList.add("time-input");
      timeInput.id = `time-${currentYear}-${currentMonth + 1}-${i}`;
      timeArea.appendChild(timeInput);
      locationTimeContainer.appendChild(timeArea);
      
      itemDisplayArea.appendChild(locationTimeContainer);
      dateRow.appendChild(itemDisplayArea);

      datesContainer.appendChild(dateRow);

      // 保存されたアイテム、場所、時間を表示
      const dateString = `${currentYear}-${currentMonth + 1}-${i}`;
      const savedDataForDate = JSON.parse(localStorage.getItem(dateString));
      if (savedDataForDate) {
        displaySelectedItemsForDate(dateString, savedDataForDate.items);
        locationInput.value = savedDataForDate.location || "";
        timeInput.value = savedDataForDate.time || "";
      }

      // 場所の自動保存
      locationInput.addEventListener(
        "input",
        debounce(() => {
          const data = JSON.parse(localStorage.getItem(dateString)) || {};
          data.location = locationInput.value;
          localStorage.setItem(dateString, JSON.stringify(data));
        }, 500)
      );

      // 時間の自動保存
      timeInput.addEventListener(
        "change",
        debounce(() => {
          const data = JSON.parse(localStorage.getItem(dateString)) || {};
          data.time = timeInput.value;
          localStorage.setItem(dateString, JSON.stringify(data));
        }, 500)
      );
    }
  }

  // 月移動ボタンの要素
  const prevMonthBtn = document.getElementById("prevMonth");
  const nextMonthBtn = document.getElementById("nextMonth");

  prevMonthBtn.addEventListener("click", () => {
    currentMonth--;
    if (currentMonth < 0) {
      currentMonth = 11;
      currentYear--;
    }
    renderCalendar();
  });

  nextMonthBtn.addEventListener("click", () => {
    currentMonth++;
    if (currentMonth > 11) {
      currentMonth = 0;
      currentYear++;
    }
    renderCalendar();
  });

  renderCalendar();

  // ファイル一覧モーダルの要素
  const filesModal = document.getElementById("filesModal");
  const viewFilesBtn = document.getElementById("viewFilesBtn");
  const closeFilesModal = document.getElementById("closeFilesModal");
  const closeFilesBtn = document.getElementById("closeFilesBtn");
  const filesList = document.getElementById("filesList");

  function openFilesModal() {
    filesModal.style.display = "flex";
    displayFilesList();
  }

  function closeFilesModalFunc() {
    filesModal.style.display = "none";
  }

  async function displayFilesList() {
    try {
      const files = await getAllFilesFromDB();
      filesList.innerHTML = "";

      if (files.length === 0) {
        filesList.innerHTML = ""; // 空のメッセージはCSSで表示
        return;
      }

      files.forEach((file) => {
        const fileItem = document.createElement("div");
        fileItem.classList.add("file-item");

        const fileInfo = document.createElement("div");
        fileInfo.classList.add("file-info");

        const fileName = document.createElement("div");
        fileName.classList.add("file-name");
        fileName.textContent = file.fileName;

        const fileDate = document.createElement("div");
        fileDate.classList.add("file-date");
        fileDate.textContent = file.displayDate;

        fileInfo.appendChild(fileName);
        fileInfo.appendChild(fileDate);

        const fileActions = document.createElement("div");
        fileActions.classList.add("file-actions");

        // 表示ボタン
        const viewBtn = document.createElement("button");
        viewBtn.classList.add("file-action-btn");
        viewBtn.textContent = "表示";
        viewBtn.addEventListener("click", () => viewFile(file));

        // 共有ボタン
        const shareBtn = document.createElement("button");
        shareBtn.classList.add("file-action-btn");
        shareBtn.textContent = "共有";
        shareBtn.addEventListener("click", () => shareFile(file));

        // ダウンロードボタン
        const downloadBtn = document.createElement("button");
        downloadBtn.classList.add("file-action-btn");
        downloadBtn.textContent = "保存";
        downloadBtn.addEventListener("click", () => downloadFile(file));

        // 削除ボタン
        const deleteBtn = document.createElement("button");
        deleteBtn.classList.add("file-action-btn", "delete-btn");
        deleteBtn.textContent = "削除";
        deleteBtn.addEventListener("click", async () => {
          if (confirm(`「${file.fileName}」を削除しますか？`)) {
            await deleteFileFromDB(file.id);
            await displayFilesList();
          }
        });

        fileActions.appendChild(viewBtn);
        fileActions.appendChild(shareBtn);
        fileActions.appendChild(downloadBtn);
        fileActions.appendChild(deleteBtn);

        fileItem.appendChild(fileInfo);
        fileItem.appendChild(fileActions);
        filesList.appendChild(fileItem);
      });
    } catch (error) {
      console.error("ファイル一覧の取得に失敗しました:", error);
      filesList.innerHTML = "<div style='color: #FFEB3B; padding: 20px; text-align: center;'>ファイルの読み込みに失敗しました</div>";
    }
  }

  function viewFile(file) {
    // 新しいモーダルでファイル内容を表示
    const viewModal = document.createElement("div");
    viewModal.classList.add("modal");
    viewModal.style.display = "flex";

    const viewContent = document.createElement("div");
    viewContent.classList.add("modal-content");
    viewContent.style.maxWidth = "800px";

    const closeBtn = document.createElement("span");
    closeBtn.classList.add("close-button");
    closeBtn.textContent = "×";
    closeBtn.addEventListener("click", () => {
      document.body.removeChild(viewModal);
    });

    const title = document.createElement("h2");
    title.textContent = file.fileName;
    title.style.color = "#FFEB3B";

    const content = document.createElement("pre");
    content.style.backgroundColor = "rgba(0, 0, 0, 0.8)";
    content.style.color = "#FFEB3B";
    content.style.padding = "20px";
    content.style.borderRadius = "8px";
    content.style.overflow = "auto";
    content.style.maxHeight = "60vh";
    content.style.whiteSpace = "pre-wrap";
    content.style.wordWrap = "break-word";
    content.textContent = file.content;

    const buttons = document.createElement("div");
    buttons.classList.add("modal-buttons");

    const closeViewBtn = document.createElement("button");
    closeViewBtn.textContent = "閉じる";
    closeViewBtn.addEventListener("click", () => {
      document.body.removeChild(viewModal);
    });
    buttons.appendChild(closeViewBtn);

    viewContent.appendChild(closeBtn);
    viewContent.appendChild(title);
    viewContent.appendChild(content);
    viewContent.appendChild(buttons);
    viewModal.appendChild(viewContent);
    document.body.appendChild(viewModal);

    viewModal.addEventListener("click", (e) => {
      if (e.target === viewModal) {
        document.body.removeChild(viewModal);
      }
    });
  }

  async function shareFile(file) {
    if (navigator.share) {
      // Web Share APIを使用（スマホ向け）
      const blob = new Blob([file.content], { type: "text/plain" });
      const fileObj = new File([blob], file.fileName, { type: "text/plain" });

      try {
        await navigator.share({
          title: file.fileName,
          text: file.content,
          files: [fileObj],
        });
      } catch (error) {
        if (error.name !== "AbortError") {
          console.error("共有に失敗しました:", error);
          alert("共有に失敗しました");
        }
      }
    } else {
      // Web Share APIが使えない場合はダウンロード
      downloadFile(file);
    }
  }

  function downloadFile(file) {
    const blob = new Blob([file.content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = file.fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  viewFilesBtn.addEventListener("click", openFilesModal);
  closeFilesModal.addEventListener("click", closeFilesModalFunc);
  closeFilesBtn.addEventListener("click", closeFilesModalFunc);
  window.addEventListener("click", (e) => {
    if (e.target === filesModal) {
      closeFilesModalFunc();
    }
  });
});
