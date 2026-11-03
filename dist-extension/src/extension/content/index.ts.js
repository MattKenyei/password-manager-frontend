import { send } from "/src/extension/shared/messages.ts.js";
const BADGE_CLASS = "pm-autofill-badge";
const isLoginPage = () => {
	return !!document.querySelector("input[type=\"password\"]");
};
const findFields = () => {
	const password = document.querySelector("input[type=\"password\"]");
	if (!password) return {
		user: null,
		pass: null
	};
	const form = password.closest("form") ?? password.parentElement?.parentElement ?? document.body;
	const candidates = form.querySelectorAll("input[type=\"text\"], input[type=\"email\"], input[name*=\"user\" i], input[name*=\"email\" i], input[id*=\"user\" i], input[id*=\"email\" i]");
	let user = null;
	for (const c of candidates) {
		if (c === password) continue;
		if (c.compareDocumentPosition(password) & Node.DOCUMENT_POSITION_FOLLOWING) {
			user = c;
		}
	}
	return {
		user,
		pass: password
	};
};
const injectBadge = (passInput) => {
	if (document.querySelector(`.${BADGE_CLASS}`)) return;
	const badge = document.createElement("div");
	badge.className = BADGE_CLASS;
	badge.textContent = "🔒 P";
	badge.style.cssText = `
    position: absolute;
    z-index: 2147483647;
    background: #4f46e5;
    color: white;
    font-family: system-ui, sans-serif;
    font-size: 12px;
    padding: 4px 8px;
    border-radius: 4px;
    cursor: pointer;
    box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    user-select: none;
  `;
	const rect = passInput.getBoundingClientRect();
	badge.style.left = `${rect.right + window.scrollX - 40}px`;
	badge.style.top = `${rect.top + window.scrollY + 6}px`;
	badge.addEventListener("click", async (e) => {
		e.preventDefault();
		e.stopPropagation();
		const resp = await send({
			type: "GET_CREDENTIALS_FOR_URL",
			url: window.location.href
		});
		if (!resp.ok) {
			showToast("Vault is locked. Open Password Manager to unlock.");
			return;
		}
		if (resp.data.length === 0) {
			showToast("No credentials for this site");
			return;
		}
		if (resp.data.length === 1) {
			fillCredentials(resp.data[0]);
		} else {
			showPicker(resp.data);
		}
	});
	document.body.appendChild(badge);
	const reposition = () => {
		const r = passInput.getBoundingClientRect();
		badge.style.left = `${r.right + window.scrollX - 40}px`;
		badge.style.top = `${r.top + window.scrollY + 6}px`;
	};
	window.addEventListener("scroll", reposition, { passive: true });
	window.addEventListener("resize", reposition, { passive: true });
};
const fillCredentials = (cred) => {
	const { user, pass } = findFields();
	if (user) {
		setNativeValue(user, cred.username);
	}
	if (pass) {
		setNativeValue(pass, cred.password);
	}
	removeBadge();
	removePicker();
};
const setNativeValue = (el, value) => {
	const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
	setter?.call(el, value);
	el.dispatchEvent(new Event("input", { bubbles: true }));
	el.dispatchEvent(new Event("change", { bubbles: true }));
};
const showPicker = (candidates) => {
	removePicker();
	const picker = document.createElement("div");
	picker.id = "pm-autofill-picker";
	picker.style.cssText = `
    position: fixed;
    z-index: 2147483647;
    top: 20px;
    right: 20px;
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    box-shadow: 0 4px 16px rgba(0,0,0,0.15);
    font-family: system-ui, sans-serif;
    font-size: 13px;
    min-width: 260px;
  `;
	const header = document.createElement("div");
	header.textContent = "Choose account";
	header.style.cssText = "padding: 10px 12px; font-weight: 600; border-bottom: 1px solid #e5e7eb;";
	picker.appendChild(header);
	for (const c of candidates) {
		const row = document.createElement("div");
		row.style.cssText = "padding: 8px 12px; cursor: pointer; border-bottom: 1px solid #f3f4f6;";
		row.innerHTML = `<div style="font-weight:500">${escapeHtml(c.title)}</div><div style="font-size:11px;color:#6b7280">${escapeHtml(c.username)}</div>`;
		row.addEventListener("mouseenter", () => {
			row.style.background = "#f9fafb";
		});
		row.addEventListener("mouseleave", () => {
			row.style.background = "";
		});
		row.addEventListener("click", () => fillCredentials(c));
		picker.appendChild(row);
	}
	document.body.appendChild(picker);
};
const removePicker = () => {
	document.getElementById("pm-autofill-picker")?.remove();
};
const removeBadge = () => {
	document.querySelector(`.${BADGE_CLASS}`)?.remove();
};
const escapeHtml = (s) => s.replace(/[&<>"']/g, (c) => ({
	"&": "&amp;",
	"<": "&lt;",
	">": "&gt;",
	"\"": "&quot;",
	"'": "&#39;"
})[c]);
const showToast = (msg) => {
	const t = document.createElement("div");
	t.textContent = msg;
	t.style.cssText = `
    position: fixed; z-index: 2147483647; bottom: 20px; right: 20px;
    background: #1f2937; color: white; padding: 10px 16px; border-radius: 8px;
    font-family: system-ui, sans-serif; font-size: 13px;
  `;
	document.body.appendChild(t);
	setTimeout(() => t.remove(), 3e3);
};
const init = () => {
	if (!isLoginPage()) return;
	const { pass } = findFields();
	if (!pass) return;
	const tryInject = () => {
		const { pass: p } = findFields();
		if (p) injectBadge(p);
	};
	setTimeout(tryInject, 500);
};
if (document.readyState === "loading") {
	document.addEventListener("DOMContentLoaded", init);
} else {
	init();
}
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
	if (msg?.type !== "FILL_CREDENTIALS") return;
	try {
		const { user, pass } = findFields();
		let filled = false;
		if (user && msg.username) {
			setNativeValue(user, msg.username);
			filled = true;
		}
		if (pass && msg.password) {
			setNativeValue(pass, msg.password);
			filled = true;
		}
		sendResponse({ ok: filled });
	} catch (err) {
		sendResponse({
			ok: false,
			error: String(err)
		});
	}
	return true;
});
let lastUrl = location.href;
new MutationObserver(() => {
	if (location.href !== lastUrl) {
		lastUrl = location.href;
		removeBadge();
		removePicker();
		setTimeout(init, 500);
	}
}).observe(document, {
	subtree: true,
	childList: true
});
