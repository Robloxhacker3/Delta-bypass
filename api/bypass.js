function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function showNotification(message) {
    console.log('Showing notification...');
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.style.position = 'fixed';
    notification.style.bottom = '20px';
    notification.style.right = '20px';
    notification.style.backgroundColor = '#28a745';
    notification.style.color = 'white';
    notification.style.padding = '10px 20px';
    notification.style.fontSize = '16px';
    notification.style.borderRadius = '10px';
    notification.style.zIndex = '9999'; // Ensure it's on top
    notification.style.boxShadow = '0 0 10px rgba(0, 0, 0, 0.5)';

    document.body.appendChild(notification);

    // Clean up after 3 seconds
    setTimeout(() => {
        document.body.removeChild(notification);
    }, 3000);
}

async function delta() {
    const startTime = performance.now(); // Record the start time

    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get("id");
    const tk = urlParams.get("tk");

    showBypassingUI();

    // Fetch the key data
    const keyDataPromise = fetch(`https://api-gateway.platoboost.com/v1/authenticators/8/${id}`).then((res) =>
        res.json()
    );

    // Handle `tk` if present
    if (tk) {
        await sleep(3000);
        try {
            const response = await fetch(`https://api-gateway.platoboost.com/v1/sessions/auth/8/${id}/${tk}`, {
                method: "PUT",
            }).then((res) => res.json());

            // Redirect if successful
            if (response.redirect) {
                const elapsedTime = (performance.now() - startTime) / 1000; // Calculate time in seconds
                showNotification(`Bypassed in ${elapsedTime.toFixed(2)} seconds.`);
                await sleep(2000); // Wait for 2 seconds
                window.location.assign(response.redirect);
            }
            return;
        } catch (err) {
            console.error("Error during session auth:", err);
        }
    }

    // Wait for key data to resolve
    const keyData = await keyDataPromise;

    // If key is present, exit early
    if (keyData.key) {
        const elapsedTime = (performance.now() - startTime) / 1000; // Calculate time in seconds
        navigator.clipboard
            .writeText(keyData.key)
            .then(() => {
                showNotification(`Key bypassed in ${elapsedTime.toFixed(2)} seconds. Copied to clipboard!`);
            })
            .catch((err) => {
                console.error("Failed to copy key to clipboard:", err);
            });
        return;
    }

    // Handle captcha and session creation if needed
    try {
        const captcha = keyData.captcha ? await getTurnstileResponse() : "";
        const sessionData = await fetch(`https://api-gateway.platoboost.com/v1/sessions/auth/8/${id}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ captcha, type: captcha ? "Turnstile" : "" }),
        }).then((res) => res.json());

        await sleep(1000);

        // Handle redirection
        const redirectUrl = decodeURIComponent(sessionData.redirect);
        const redirectParam = new URL(redirectUrl).searchParams.get("r");
        const decodedUrl = atob(redirectParam);

        const elapsedTime = (performance.now() - startTime) / 1000; // Calculate time in seconds
        showNotification(`Bypassed in ${elapsedTime.toFixed(2)} seconds.`);
        await sleep(2000); // Wait for 2 seconds
        window.location.assign(decodedUrl);
    } catch (err) {
        console.error("Error handling captcha session:", err);
    }
}

async function getTurnstileResponse() {
    let response = "";
    while (!response) {
        try {
            response = turnstile.getResponse();
        } catch (e) {}
        await sleep(5);
    }
    return response;
}

if (
    window.location.href.includes("gateway.platoboost.com/a/8") ||
    window.location.href.includes("gateway.platoboost.com/a/2")
) {
    delta();
}
