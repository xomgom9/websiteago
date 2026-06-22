(() => {
  const FIELD_CLASS = "facebook-name-field";
  const FIELD_MARKER = "facebookNameField";
  const MAIN_FIELD_NAME = "facebook_name";
  const POPUP_FIELD_NAME = "popup-facebook-name";
  const MAIN_LABEL_TEXT = "Facebook Name";
  const PLACEHOLDER_TEXT = "Name used on Facebook";

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
