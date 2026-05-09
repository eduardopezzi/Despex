---
layout: default
title: Screenshots
nav_order: 3
---

# Screenshots

A visual tour of the Open Receipt OCR interface.

---

## 🎥 Demo Video

<video src="assets/screenshots/open-receipt-ocr.mp4" controls width="100%"></video>

---

## Dashboard

The dashboard gives an at-a-glance summary of your OCR activity: total jobs, completed, processing, and failed counts, plus a list of recent jobs.

![Dashboard](assets/screenshots/dashboard-view.png)

---

## OCR Jobs — Card View

The jobs listing in card view. Each card shows the job name, creation date, status badge, file thumbnails, and a delete button.

![OCR Jobs card view](assets/screenshots/ocr-jobs-card-view.png)

---

## OCR Jobs — Table View

The same listing switched to table view, showing sortable columns for ID, Name, Date, Status, and Files.

![OCR Jobs table view](assets/screenshots/ocr-jobs-table-view.png)

---

## Creating an OCR Job

Click **+ Add OCR Job** to open the creation dialog. Give the job a name, then choose one or more files to upload.

![Create OCR Job dialog](assets/screenshots/add-ocr-job-modal.png)

---

## Multiple Files per Job

A single job can process multiple files at once. Each file has its own OCR provider selector so you can mix providers within the same job.

![Multiple files in one job](assets/screenshots/add-ocr-modal-multiple-files.png)

---

## Image Crop

When uploading an image, an optional crop dialog lets you frame the receipt before sending it for OCR. Supports rotate, zoom, and flip controls.

![Image crop dialog](assets/screenshots/add-ocr-modal-apply-crop.png)

---

## Job Detail — OCR Results

Clicking a job opens the detail panel. The receipt image is shown on the left. On the right, **Execution History** tracks every OCR run and the **OCR Output Content** panel displays the structured text extracted from the receipt.

![OCR job detail with results](assets/screenshots/ocr-job-modal.png)

---

## Job Detail — Failed Execution

When an execution fails (e.g. an invalid API key), the **OCR Output Content** panel shows the provider's error message. You can retry by clicking **Reprocess**.

![OCR job with a failed execution](assets/screenshots/ocr-job-modal-failed.png)

---

## Default OCR & Output Settings

The settings dialog lets you pick a **default OCR provider** (local or cloud) and configure **output targets**. The selected provider is used automatically when uploading new jobs.

![Default OCR and Output Settings dialog](assets/screenshots/default-settings-modal.png)

---

## 🌙 Dark Mode

The UI supports a dark theme toggled from the top navigation bar. All pages adapt automatically.

![OCR Jobs in dark mode](assets/screenshots/dark-mode.png)

---

## 🌍 Localisation

The interface is fully localised. Switch languages via the language toggle in the top bar. Supported languages include English, Portuguese, French, and German.

![OCR Jobs in German](assets/screenshots/ocr-jobs-language-selector.png)

---

*All screenshots taken from a locally running instance.*
