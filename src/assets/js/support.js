const SUPPORT_IMAGE_LIMIT = 4;
const SUPPORT_IMAGE_BYTES = 8 * 1024 * 1024;
const SUPPORT_TOTAL_BYTES = 20 * 1024 * 1024;
const SUPPORT_MAX_PIXELS = 25_000_000;
const SUPPORT_DRAFT_KEY = "r7-support-draft-v1";
const SUPPORT_DRAFT_IMAGE_DB = "r7-support-draft-images-v1";
const SUPPORT_DRAFT_IMAGE_STORE = "drafts";
const SUPPORT_DRAFT_MAX_AGE_MS = 24 * 60 * 60 * 1000;
const TURNSTILE_SCRIPT_URL = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

let turnstileScriptPromise = null;

function makeRandomId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  const bytes = new Uint8Array(16);
  globalThis.crypto?.getRandomValues?.(bytes);
  return [...bytes].map((value) => value.toString(16).padStart(2, "0")).join("") || `${Date.now()}-${Math.random()}`;
}

function matchesBytes(bytes, expected, offset = 0) {
  return expected.every((value, index) => bytes[offset + index] === value);
}

async function readImageType(file) {
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());

  if (matchesBytes(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png";
  if (matchesBytes(bytes, [0xff, 0xd8, 0xff])) return "image/jpeg";
  if (
    matchesBytes(bytes, [0x52, 0x49, 0x46, 0x46]) &&
    matchesBytes(bytes, [0x57, 0x45, 0x42, 0x50], 8)
  ) {
    return "image/webp";
  }

  return "";
}

function readImageSize(file) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(file);

    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: image.naturalWidth, height: image.naturalHeight });
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("This image could not be read."));
    };
    image.src = url;
  });
}

function openDraftImageDb() {
  if (!("indexedDB" in globalThis)) return Promise.resolve(null);

  return new Promise((resolve) => {
    let settled = false;
    const finish = (db = null) => {
      if (settled) {
        db?.close();
        return;
      }
      settled = true;
      clearTimeout(timeout);
      resolve(db);
    };
    const timeout = setTimeout(() => finish(), 750);
    let request;
    try {
      request = indexedDB.open(SUPPORT_DRAFT_IMAGE_DB, 1);
    } catch (error) {
      finish();
      return;
    }
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(SUPPORT_DRAFT_IMAGE_STORE)) {
        request.result.createObjectStore(SUPPORT_DRAFT_IMAGE_STORE, { keyPath: "key" });
      }
    };
    request.onsuccess = () => finish(request.result);
    request.onerror = () => finish();
    request.onblocked = () => finish();
  });
}

async function readDraftImages(key) {
  const db = await openDraftImageDb().catch(() => null);
  if (!db || !key) return [];

  return new Promise((resolve) => {
    const transaction = db.transaction(SUPPORT_DRAFT_IMAGE_STORE, "readonly");
    const request = transaction.objectStore(SUPPORT_DRAFT_IMAGE_STORE).get(key);
    request.onsuccess = () => {
      const record = request.result;
      if (!record || Date.now() - record.savedAt > SUPPORT_DRAFT_MAX_AGE_MS) {
        resolve([]);
        return;
      }
      resolve(Array.isArray(record.images) ? record.images : []);
    };
    request.onerror = () => resolve([]);
    transaction.oncomplete = () => db.close();
    transaction.onerror = () => db.close();
  });
}

async function writeDraftImages(key, files) {
  const db = await openDraftImageDb().catch(() => null);
  if (!db || !key) return;

  await new Promise((resolve) => {
    const transaction = db.transaction(SUPPORT_DRAFT_IMAGE_STORE, "readwrite");
    const store = transaction.objectStore(SUPPORT_DRAFT_IMAGE_STORE);
    if (!files.length) {
      store.delete(key);
    } else {
      store.put({
        key,
        savedAt: Date.now(),
        images: files.map((file) => ({
          blob: file.slice(0, file.size, file.type),
          name: file.name,
          type: file.type,
          lastModified: file.lastModified
        }))
      });
    }
    transaction.oncomplete = resolve;
    transaction.onerror = resolve;
    transaction.onabort = resolve;
  });
  db.close();
}

async function deleteDraftImages(key) {
  if (!key) return;
  await writeDraftImages(key, []);
}

async function cleanOldDraftImages() {
  const db = await openDraftImageDb().catch(() => null);
  if (!db) return;

  await new Promise((resolve) => {
    const transaction = db.transaction(SUPPORT_DRAFT_IMAGE_STORE, "readwrite");
    const request = transaction.objectStore(SUPPORT_DRAFT_IMAGE_STORE).openCursor();
    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor) return;
      if (Date.now() - Number(cursor.value?.savedAt || 0) > SUPPORT_DRAFT_MAX_AGE_MS) cursor.delete();
      cursor.continue();
    };
    transaction.oncomplete = resolve;
    transaction.onerror = resolve;
    transaction.onabort = resolve;
  });
  db.close();
}

function loadTurnstileScript() {
  if (globalThis.turnstile) return Promise.resolve(globalThis.turnstile);
  if (turnstileScriptPromise) return turnstileScriptPromise;

  turnstileScriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${TURNSTILE_SCRIPT_URL}"]`);
    const script = existing || document.createElement("script");
    script.addEventListener("load", () => {
      if (!globalThis.turnstile) {
        reject(new Error("Spam protection did not load. Please try again."));
        return;
      }
      resolve(globalThis.turnstile);
    }, { once: true });
    script.addEventListener("error", () => reject(new Error("Spam protection did not load. Please try again.")), { once: true });
    if (!existing) {
      script.src = TURNSTILE_SCRIPT_URL;
      script.async = true;
      document.head.append(script);
    }
  });

  return turnstileScriptPromise;
}

function initSupportForm() {
  const form = document.querySelector("[data-support-form]");
  if (!form) return;

  const heading = document.querySelector(".support-heading");
  const imageInput = form.querySelector("[data-support-images]");
  const imageGrid = form.querySelector("[data-support-image-grid]");
  const status = form.querySelector("[data-support-status]");
  const submit = form.querySelector("[data-support-submit]");
  const submitLabel = form.querySelector("[data-support-submit-label]");
  const submitSpinner = form.querySelector("[data-support-submit-spinner]");
  const turnstileContainer = form.querySelector("[data-support-turnstile]");
  const success = document.querySelector("[data-support-success]");
  const selectedImages = [];
  const isPreview = form.dataset.supportPreview === "true";
  const endpoint = form.dataset.supportEndpoint || "/api/support.php";
  let formToken = "";
  let turnstileSiteKey = "";
  let turnstileWidgetId = null;
  let turnstileAttempt = null;
  let liveSessionPromise = null;
  let imageUpdateChain = Promise.resolve();
  let imageSaveChain = Promise.resolve();
  let draft = readDraft();

  if (!imageInput || !imageGrid || !status || !submit || !submitLabel || !submitSpinner || !turnstileContainer || !success) return;

  if (!draft) {
    draft = {
      imageKey: makeRandomId(),
      idempotencyKey: makeRandomId(),
      category: "feedback",
      name: "",
      email: "",
      message: ""
    };
  }

  function setStatus(message, tone = "") {
    status.textContent = message;
    status.dataset.tone = tone;
  }

  function setSubmitState(label, busy) {
    submitLabel.textContent = label;
    submitSpinner.hidden = !busy;
    submit.setAttribute("aria-busy", String(busy));
  }

  function readDraft() {
    try {
      const value = JSON.parse(sessionStorage.getItem(SUPPORT_DRAFT_KEY) || "null");
      if (!value || typeof value !== "object") return null;
      return {
        imageKey: typeof value.imageKey === "string" && value.imageKey ? value.imageKey : makeRandomId(),
        idempotencyKey: typeof value.idempotencyKey === "string" && value.idempotencyKey ? value.idempotencyKey : makeRandomId(),
        category: value.category === "bug" ? "bug" : "feedback",
        name: typeof value.name === "string" ? value.name.slice(0, 100) : "",
        email: typeof value.email === "string" ? value.email.slice(0, 254) : "",
        message: typeof value.message === "string" ? value.message.slice(0, 12000) : ""
      };
    } catch (error) {
      return null;
    }
  }

  function captureDraft() {
    return {
      imageKey: draft.imageKey,
      idempotencyKey: draft.idempotencyKey,
      category: form.elements.category?.value === "bug" ? "bug" : "feedback",
      name: String(form.elements.name?.value || "").slice(0, 100),
      email: String(form.elements.email?.value || "").slice(0, 254),
      message: String(form.elements.message?.value || "").slice(0, 12000)
    };
  }

  function saveTextDraft() {
    draft = captureDraft();
    const hasContent = draft.name || draft.email || draft.message || draft.category === "bug" || selectedImages.length;
    try {
      if (hasContent) sessionStorage.setItem(SUPPORT_DRAFT_KEY, JSON.stringify(draft));
      else sessionStorage.removeItem(SUPPORT_DRAFT_KEY);
    } catch (error) {
      // Draft recovery is best-effort and must never block the form.
    }
  }

  function saveImageDraft() {
    saveTextDraft();
    const files = selectedImages.map((entry) => entry.file);
    imageSaveChain = imageSaveChain
      .catch(() => {})
      .then(() => writeDraftImages(draft.imageKey, files))
      .catch(() => {});
    return imageSaveChain;
  }

  function clearDraft() {
    try {
      sessionStorage.removeItem(SUPPORT_DRAFT_KEY);
    } catch (error) {
      // Keep success behavior intact if browser storage is unavailable.
    }
    const imageKey = draft.imageKey;
    imageSaveChain = imageSaveChain
      .catch(() => {})
      .then(() => deleteDraftImages(imageKey))
      .catch(() => {});
  }

  function renderImages() {
    imageGrid.replaceChildren();

    selectedImages.forEach((entry, index) => {
      const item = document.createElement("figure");
      item.className = "support-image-item";

      const image = document.createElement("img");
      image.src = entry.previewUrl;
      image.alt = entry.file.name;

      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "support-image-remove";
      remove.setAttribute("aria-label", `Remove ${entry.file.name}`);
      remove.textContent = "Remove";
      remove.addEventListener("click", () => {
        URL.revokeObjectURL(entry.previewUrl);
        selectedImages.splice(index, 1);
        renderImages();
        saveImageDraft();
        setStatus("");
      });

      item.append(image, remove);
      imageGrid.append(item);
    });
  }

  async function addImages(files, { save = true } = {}) {
    setStatus("");

    for (const file of files) {
      if (selectedImages.length >= SUPPORT_IMAGE_LIMIT) {
        setStatus("You can add up to 4 images.", "error");
        break;
      }
      if (file.size > SUPPORT_IMAGE_BYTES) {
        setStatus(`${file.name} is larger than 8 MB.`, "error");
        continue;
      }

      let imageType = "";
      try {
        imageType = await readImageType(file);
      } catch (error) {
        setStatus(`${file.name} could not be read.`, "error");
        continue;
      }
      if (!imageType) {
        setStatus(`${file.name} must be a PNG, JPEG, or WebP image.`, "error");
        continue;
      }

      const totalBytes = selectedImages.reduce((total, entry) => total + entry.file.size, 0) + file.size;
      if (totalBytes > SUPPORT_TOTAL_BYTES) {
        setStatus("The selected images are larger than 20 MB combined.", "error");
        break;
      }

      try {
        const size = await readImageSize(file);
        if (size.width * size.height > SUPPORT_MAX_PIXELS) {
          setStatus(`${file.name} is larger than 25 megapixels.`, "error");
          continue;
        }
      } catch (error) {
        setStatus(`${file.name} could not be read as an image.`, "error");
        continue;
      }

      const normalizedFile = file.type === imageType
        ? file
        : new File([file], file.name, { type: imageType, lastModified: file.lastModified });
      selectedImages.push({ file: normalizedFile, previewUrl: URL.createObjectURL(normalizedFile) });
    }

    renderImages();
    if (save) saveImageDraft();
  }

  async function restoreDraft() {
    const category = form.querySelector(`input[name="category"][value="${draft.category}"]`);
    if (category) category.checked = true;
    form.elements.name.value = draft.name;
    form.elements.email.value = draft.email;
    form.elements.message.value = draft.message;

    const storedImages = await readDraftImages(draft.imageKey);
    const files = storedImages
      .filter((entry) => entry?.blob instanceof Blob)
      .map((entry) => new File([entry.blob], entry.name || "image", {
        type: entry.type || entry.blob.type,
        lastModified: Number(entry.lastModified || Date.now())
      }));
    await addImages(files, { save: false });
  }

  async function ensureLiveSession() {
    if (isPreview) return null;
    if (formToken && turnstileSiteKey) return { formToken, turnstileSiteKey };
    if (liveSessionPromise) return liveSessionPromise;

    liveSessionPromise = fetch(`${endpoint}?action=init`, {
      method: "GET",
      credentials: "same-origin",
      cache: "no-store",
      headers: { Accept: "application/json" }
    })
      .then(async (response) => {
        const result = await response.json().catch(() => ({}));
        if (!response.ok || !result.ok || !result.formToken || !result.turnstileSiteKey) {
          throw new Error(result.message || "The message service is unavailable. Please try again.");
        }
        formToken = result.formToken;
        turnstileSiteKey = result.turnstileSiteKey;
        return { formToken, turnstileSiteKey };
      })
      .catch((error) => {
        liveSessionPromise = null;
        throw error;
      });

    return liveSessionPromise;
  }

  async function ensureTurnstileWidget() {
    await ensureLiveSession();
    const turnstile = await loadTurnstileScript();
    if (turnstileWidgetId !== null) return turnstile;

    turnstileWidgetId = turnstile.render(turnstileContainer, {
      sitekey: turnstileSiteKey,
      action: "support_message",
      execution: "execute",
      appearance: "interaction-only",
      callback(token) {
        turnstileAttempt?.resolve(token);
        turnstileAttempt = null;
      },
      "error-callback"() {
        turnstileAttempt?.reject(new Error("Spam protection failed. Please try again."));
        turnstileAttempt = null;
      },
      "expired-callback"() {
        turnstileAttempt?.reject(new Error("Spam protection expired. Please try again."));
        turnstileAttempt = null;
      },
      "timeout-callback"() {
        turnstileAttempt?.reject(new Error("Spam protection timed out. Please try again."));
        turnstileAttempt = null;
      }
    });
    return turnstile;
  }

  async function getFreshTurnstileToken() {
    const turnstile = await ensureTurnstileWidget();
    if (turnstileAttempt) throw new Error("Spam protection is already running.");
    turnstile.reset(turnstileWidgetId);

    const token = await new Promise((resolve, reject) => {
      turnstileAttempt = { resolve, reject };
      turnstile.execute(turnstileWidgetId);
    });
    if (!token) throw new Error("Spam protection did not return a token. Please try again.");
    return token;
  }

  function buildSubmission(turnstileToken) {
    const data = new FormData();
    data.append("category", form.elements.category.value);
    data.append("name", form.elements.name.value);
    data.append("email", form.elements.email.value);
    data.append("message", form.elements.message.value);
    data.append("website", form.elements.website.value);
    data.append("formToken", formToken);
    data.append("turnstileToken", turnstileToken);
    data.append("idempotencyKey", draft.idempotencyKey);
    selectedImages.forEach((entry) => data.append("images[]", entry.file, entry.file.name));
    return data;
  }

  async function readSubmissionResponse(response) {
    const contentType = response.headers.get("content-type") || "";
    const result = contentType.includes("application/json")
      ? await response.json().catch(() => ({}))
      : {};

    if (response.status === 413) {
      throw new Error("The selected images are too large for the server. Remove one and try again.");
    }
    if (!response.ok || !result.ok) {
      const error = new Error(result.message || "The message could not be sent. Please try again.");
      error.code = String(result.code || "");
      error.retryAfter = Number(result.retryAfter || 0);
      throw error;
    }
    return result;
  }

  function showSuccess() {
    selectedImages.splice(0).forEach((entry) => URL.revokeObjectURL(entry.previewUrl));
    clearDraft();
    form.reset();
    if (heading) heading.hidden = true;
    form.hidden = true;
    success.hidden = false;
    success.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  imageInput.addEventListener("change", () => {
    const files = [...imageInput.files];
    imageInput.value = "";
    imageUpdateChain = imageUpdateChain
      .catch(() => {})
      .then(() => addImages(files));
  });

  form.addEventListener("input", (event) => {
    if (["name", "email", "message"].includes(event.target?.name)) saveTextDraft();
  });
  form.addEventListener("change", (event) => {
    if (event.target?.name === "category") saveTextDraft();
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    setStatus("");

    await imageUpdateChain.catch(() => {});

    if (!form.reportValidity()) return;
    saveTextDraft();

    if (isPreview) {
      setStatus("This preview is ready for review. Sending will be connected before publication.", "info");
      return;
    }

    submit.disabled = true;
    setSubmitState("Checking", true);

    try {
      await ensureLiveSession();
      const turnstileToken = await getFreshTurnstileToken();
      setSubmitState("Sending", true);

      const response = await fetch(endpoint, {
        method: "POST",
        body: buildSubmission(turnstileToken),
        credentials: "same-origin",
        headers: { Accept: "application/json" }
      });
      await readSubmissionResponse(response);
      showSuccess();
    } catch (error) {
      if (["form_expired", "form_invalid", "browser_session_missing"].includes(error.code)) {
        formToken = "";
        liveSessionPromise = null;
      }
      const retryMessage = error.retryAfter > 0
        ? ` You can try again in ${Math.ceil(error.retryAfter)} seconds.`
        : "";
      setStatus(`${error.message || "The message could not be sent. Please try again."}${retryMessage}`, "error");
    } finally {
      if (turnstileWidgetId !== null && globalThis.turnstile) globalThis.turnstile.reset(turnstileWidgetId);
      if (!form.hidden) {
        submit.disabled = false;
        setSubmitState("Send", false);
      }
    }
  });

  cleanOldDraftImages();
  imageUpdateChain = imageUpdateChain.then(() => restoreDraft());
  if (!isPreview) ensureLiveSession().catch(() => {});
}

document.addEventListener("DOMContentLoaded", initSupportForm);
