/**
 * Evermore Platform Settings Synchronization
 * Synchronizes subscription (activation) fee, bank account details,
 * and pricing across the entire platform in real time.
 */
(function() {
    'use strict';

    var STORAGE_KEY = 'evermore_platform_settings';
    var DEFAULT_SETTINGS = {
        bankName: 'KUDA MFB',
        accountNumber: '3004350517',
        accountName: 'VICTORBLOG SERVICES-EVERMORE',
        price: '₦14,850',
        amount: 14850,
        telegramLink: 'https://t.me/evermoreai...',
        opayNotification: true
    };

    function parseAmount(val) {
        if (!val) return 14850;
        var num = parseInt(String(val).replace(/[^0-9]/g, ''), 10);
        return isNaN(num) || num <= 0 ? 14850 : num;
    }

    function formatFee(fee) {
        if (!fee) return '₦14,850';
        var str = String(fee).trim();
        var num = parseAmount(str);
        return '₦' + num.toLocaleString();
    }

    function getLocalSettings() {
        try {
            var raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                var parsed = JSON.parse(raw);
                if (parsed && typeof parsed === 'object') {
                    var isOpayActive = true;
                    if (parsed.opayNotification !== undefined) {
                        isOpayActive = parsed.opayNotification === true || parsed.opayNotification === 'true';
                    } else if (parsed.showOpayNotification !== undefined) {
                        isOpayActive = parsed.showOpayNotification === true || parsed.showOpayNotification === 'true';
                    }
                    return Object.assign({}, DEFAULT_SETTINGS, parsed, {
                        price: formatFee(parsed.price || parsed.activationFee || DEFAULT_SETTINGS.price),
                        amount: parseAmount(parsed.amount || parsed.price || DEFAULT_SETTINGS.amount),
                        telegramLink: parsed.telegramLink || DEFAULT_SETTINGS.telegramLink,
                        opayNotification: isOpayActive
                    });
                }
            }
        } catch (e) {}
        return Object.assign({}, DEFAULT_SETTINGS);
    }

    function saveLocalSettings(settings) {
        try {
            var current = getLocalSettings();
            var isOpayActive = current.opayNotification !== false;
            if (settings.opayNotification !== undefined) {
                isOpayActive = settings.opayNotification === true || settings.opayNotification === 'true';
            } else if (settings.showOpayNotification !== undefined) {
                isOpayActive = settings.showOpayNotification === true || settings.showOpayNotification === 'true';
            }
            var merged = Object.assign({}, current, settings);
            merged.price = formatFee(merged.price);
            merged.amount = parseAmount(merged.price);
            merged.telegramLink = merged.telegramLink || DEFAULT_SETTINGS.telegramLink;
            merged.opayNotification = isOpayActive;
            localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
            return merged;
        } catch (e) {
            return settings;
        }
    }

    function updateDOM(settings) {
        if (!settings) settings = getLocalSettings();
        var fee = formatFee(settings.price);
        var rawNum = parseAmount(settings.price);
        var tgLink = settings.telegramLink || DEFAULT_SETTINGS.telegramLink;
        var isOpayOn = settings.opayNotification !== false;

        // OPay Notification Alert on payment page (On shows, Off hides)
        var opayAlerts = document.querySelectorAll('#opay-notification, .ev-alert[role="alert"], [data-notification="opay"]');
        opayAlerts.forEach(function(alertEl) {
            if (isOpayOn) {
                alertEl.style.display = 'flex';
                alertEl.removeAttribute('aria-hidden');
            } else {
                alertEl.style.display = 'none';
                alertEl.setAttribute('aria-hidden', 'true');
            }
        });

        // 1. All elements marked with data-setting or dynamic class
        document.querySelectorAll('[data-setting="price"], .ev-dynamic-fee, .ev-dynamic-price').forEach(function(el) {
            el.textContent = fee;
        });

        document.querySelectorAll('[data-setting="bankName"]').forEach(function(el) {
            el.textContent = settings.bankName;
        });

        document.querySelectorAll('[data-setting="accountNumber"]').forEach(function(el) {
            el.textContent = settings.accountNumber;
        });

        document.querySelectorAll('[data-setting="accountName"]').forEach(function(el) {
            el.textContent = settings.accountName;
        });

        document.querySelectorAll('[data-setting="telegramLink"]').forEach(function(el) {
            if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                el.value = tgLink;
            } else if (el.tagName === 'A') {
                el.setAttribute('href', tgLink);
            } else {
                el.textContent = tgLink;
            }
        });

        // Update Telegram link in dashboard VIP modal and VIP button
        var vipTg = document.getElementById('vipTelegramLink');
        if (vipTg) vipTg.setAttribute('href', tgLink);

        document.querySelectorAll('.ev-vip-btn').forEach(function(btn) {
            if (btn.tagName === 'A') {
                btn.setAttribute('href', tgLink);
            }
        });

        var vipBannerCta = document.getElementById('ev-sub-cta');
        if (vipBannerCta && vipBannerCta.classList.contains('is-vip')) {
            vipBannerCta.setAttribute('href', tgLink);
        }

        // 2. Specific page elements:
        // payment.html
        var amountDisplay = document.querySelector('.ev-amount-display');
        if (amountDisplay) amountDisplay.textContent = fee;

        var priceHighlight = document.querySelector('.ev-pricing-highlight .accent');
        if (priceHighlight) priceHighlight.textContent = fee;

        var accNumEl = document.getElementById('account-number');
        if (accNumEl && settings.accountNumber) accNumEl.textContent = settings.accountNumber;

        var bankNameEl = document.getElementById('bank-name');
        if (bankNameEl && settings.bankName) bankNameEl.textContent = settings.bankName;

        var accNameEl = document.getElementById('account-name');
        if (accNameEl && settings.accountName) accNameEl.textContent = settings.accountName;

        // dashboard.html
        var subBannerTitle = document.getElementById('ev-sub-title');
        if (subBannerTitle) {
            var priceSpan = subBannerTitle.querySelector('.price');
            if (priceSpan && !priceSpan.textContent.includes('🎉') && !priceSpan.textContent.includes('Active')) {
                priceSpan.textContent = fee;
            }
        }

        // index.html
        var indexPrice = document.getElementById('ev-pricing-amount');
        if (indexPrice) indexPrice.textContent = fee;

        // auth.html
        var authPrice = document.getElementById('ev-auth-price');
        if (authPrice) authPrice.textContent = fee;

        // Any custom replacements marked with [data-fee-replace]
        document.querySelectorAll('[data-fee-replace]').forEach(function(el) {
            if (!el.dataset.origHtml) el.dataset.origHtml = el.innerHTML;
            el.innerHTML = el.dataset.origHtml.replace(/₦[0-9,]+/g, fee);
        });
    }

    // React to storage event from other tabs (e.g. Admin changes fee in admin tab)
    window.addEventListener('storage', function(e) {
        if (e.key === STORAGE_KEY) {
            var s = getLocalSettings();
            updateDOM(s);
            window.dispatchEvent(new CustomEvent('evermore:settings-changed', { detail: s }));
        }
    });

    // Custom local event within the same tab
    window.addEventListener('evermore:settings-changed', function(e) {
        if (e.detail) updateDOM(e.detail);
    });

    // Public API
    window.EvermoreSettings = {
        get: getLocalSettings,
        save: saveLocalSettings,
        parseAmount: parseAmount,
        formatFee: formatFee,
        updateDOM: updateDOM,
        apply: updateDOM
    };

    // Apply immediately to current DOM
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            updateDOM();
        });
    } else {
        updateDOM();
    }

    // Connect to Firebase for real-time live synchronization
    function initFirebaseSync() {
        if (window.EvermoreFirebase) {
            if (window.EvermoreFirebase.getPlatformSettings) {
                window.EvermoreFirebase.getPlatformSettings().then(function(live) {
                    if (live && (live.price || live.activationFee)) {
                        var updated = saveLocalSettings(live);
                        updateDOM(updated);
                    }
                }).catch(function() {});
            }

            if (window.EvermoreFirebase.onPlatformSettingsChange) {
                try {
                    window.EvermoreFirebase.onPlatformSettingsChange(function(live) {
                        if (live && (live.price || live.activationFee)) {
                            var updated = saveLocalSettings(live);
                            updateDOM(updated);
                            window.dispatchEvent(new CustomEvent('evermore:settings-changed', { detail: updated }));
                        }
                    });
                } catch (e) {}
            }
        }
    }

    // Poll briefly for Firebase client availability
    var attempts = 0;
    var syncInterval = setInterval(function() {
        attempts++;
        if (window.EvermoreFirebase) {
            clearInterval(syncInterval);
            initFirebaseSync();
        } else if (attempts > 20) {
            clearInterval(syncInterval);
        }
    }, 150);

    // Also sync from backend API
    try {
        fetch('/api/settings')
            .then(function(res) { return res.json(); })
            .then(function(data) {
                if (data && (data.price || data.activationFee)) {
                    var updated = saveLocalSettings(data);
                    updateDOM(updated);
                }
            })
            .catch(function() {});
    } catch(e) {}

})();
