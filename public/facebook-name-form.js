(() => {
  const FIELD_CLASS = "facebook-name-field";
  const FIELD_MARKER = "facebookNameField";
  const MAIN_FIELD_NAME = "facebook_name";
  const POPUP_FIELD_NAME = "popup-facebook-name";
  const MAIN_LABEL_TEXT = "Facebook Name";
  const PLACEHOLDER_TEXT = "Name used on Facebook";
  const SUBMIT_LOCK_MS = 15000;

  function createInput(name) {
    const input = document.createElement("input");
    input.type = "text";
    input.name = name;
    input.required = true;
    input.placeholder = PLACEHOLDER_TEXT;
    input.autocomplete = "off";
    input.className = "facebook-name-input";
    input.dataset[FIELD_MARKER] = "true";
    return input;
  }

  function createMainField() {
    const label = document.createElement("label");
    label.className = FIELD_CLASS;
    label.dataset[FIELD_MARKER] = "true";
    label.append(document.createTextNode(MAIN_LABEL_TEXT));
    label.appendChild(createInput(MAIN_FIELD_NAME));
    return label;
  }

  function getFacebookInput(form) {
    return form.querySelector(
      `input[name="${MAIN_FIELD_NAME}"], input[name="${POPUP_FIELD_NAME}"]`
    );
  }

  function getFormFingerprint(form) {
    const formData = new FormData(form);
    const sourceParts = [
      formData.get("name"),
      formData.get("popup-name"),
      formData.get("phone"),
      formData.get("popup-phone"),
      formData.get("address"),
      formData.get("popup-address"),
      formData.get(MAIN_FIELD_NAME),
      formData.get(POPUP_FIELD_NAME),
    ];
    return sourceParts.map((value) => String(value || "").trim().toLowerCase()).join("|");
  }

  function setSubmittingState(form, isSubmitting) {
    const submitButtons = form.querySelectorAll('button[type="submit"], input[type="submit"]');
    submitButtons.forEach((button) => {
      button.disabled = isSubmitting;
      button.setAttribute("aria-disabled", String(isSubmitting));
      if (isSubmitting) {
        button.dataset.originalText = button.textContent || button.value || "";
        if (button.tagName === "BUTTON") button.textContent = "Submitting...";
        if (button.tagName === "INPUT") button.value = "Submitting...";
      } else if (button.dataset.originalText) {
        if (button.tagName === "BUTTON") button.textContent = button.dataset.originalText;
        if (button.tagName === "INPUT") button.value = button.dataset.originalText;
        delete button.dataset.originalText;
      }
    });
  }

  function preventDuplicateSubmit(event) {
    const form = event.target;
    if (!(form instanceof HTMLFormElement)) return;
    if (!getFacebookInput(form) && !form.querySelector('input[name="name"], input[name="popup-name"]')) return;

    const now = Date.now();
    const fingerprint = getFormFingerprint(form);
    const lastFingerprint = form.dataset.lastSubmitFingerprint || "";
    const lastSubmitAt = Number(form.dataset.lastSubmitAt || 0);

    if (form.dataset.submitting === "true" || (fingerprint && fingerprint === lastFingerprint && now - lastSubmitAt < SUBMIT_LOCK_MS)) {
      event.preventDefault();
      event.stopImmediatePropagation();
      return false;
    }

    form.dataset.submitting = "true";
    form.dataset.lastSubmitFingerprint = fingerprint;
    form.dataset.lastSubmitAt = String(now);
    setSubmittingState(form, true);

    window.setTimeout(() => {
      form.dataset.submitting = "false";
      setSubmittingState(form, false);
    }, SUBMIT_LOCK_MS);

    return true;
  }

  function mergeFacebookIntoMessage(form) {
    const facebookInput = getFacebookInput(form);
    const facebookName = facebookInput?.value?.trim();
    if (!facebookName) return;

    const concernField = form.querySelector('textarea[name="concern"]');
    if (concernField) {
      const cleanConcern = concernField.value
        .replace(/^Facebook Name:.*(?:\r?\n)?/i, "")
        .trim();
      concernField.value = `Facebook Name: ${facebookName}${cleanConcern ? `\n${cleanConcern}` : ""}`;
      return;
    }

    let hiddenMessage = form.querySelector('input[name="message"][data-facebook-message="true"]');
    if (!hiddenMessage) {
      hiddenMessage = document.createElement("input");
      hiddenMessage.type = "hidden";
      hiddenMessage.name = "message";
      hiddenMessage.dataset.facebookMessage = "true";
      form.appendChild(hiddenMessage);
    }
    hiddenMessage.value = `Facebook Name: ${facebookName}`;
  }

  function attachSubmitMerge(form) {
    if (form.dataset.facebookSubmitBound === "true") return;
    form.dataset.facebookSubmitBound = "true";
    form.addEventListener("submit", () => mergeFacebookIntoMessage(form), true);
  }

  function enhanceMainForm(form) {
    const nameInput = form.querySelector('input[name="name"]');
    if (!nameInput) return false;
    if (!form.querySelector(`input[name="${MAIN_FIELD_NAME}"]`)) {
      const nameLabel = nameInput.closest("label");
      const field = createMainField();
      if (nameLabel?.parentNode) {
        nameLabel.insertAdjacentElement("afterend", field);
      } else {
        form.insertBefore(field, nameInput.nextSibling);
      }
    }
    attachSubmitMerge(form);
    return true;
  }

  function enhancePopupForm(form) {
    const popupNameInput = form.querySelector('input[name="popup-name"]');
    if (!popupNameInput) return false;
    if (!form.querySelector(`input[name="${POPUP_FIELD_NAME}"]`)) {
      const facebookInput = createInput(POPUP_FIELD_NAME);
      popupNameInput.insertAdjacentElement("afterend", facebookInput);
    }
    attachSubmitMerge(form);
    return true;
  }

  function enhanceForms(root = document) {
    root.querySelectorAll?.("form").forEach((form) => {
      enhanceMainForm(form) || enhancePopupForm(form);
    });
  }

  function start() {
    document.addEventListener("submit", preventDuplicateSubmit, true);
    enhanceForms();
    const observer = new MutationObserver(() => enhanceForms());
    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();
