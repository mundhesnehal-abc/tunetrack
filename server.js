
const http = require("http");
const { URL } = require("url");

const PORT = process.env.PORT || 3000;

// Temporary playlist storage
let songs = [];
let nextId = 1;

// Escape user input before displaying it in HTML
function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);
}

// Read form data safely
function readBody(req, res, callback) {
    let body = "";

    req.on("data", chunk => {
        body += chunk.toString();

        if (body.length > 10000) {
            res.writeHead(413, { "Content-Type": "text/plain" });
            res.end("Request too large");
            req.destroy();
        }
    });

    req.on("end", () => {
        if (!res.writableEnded && !req.destroyed) {
            callback(new URLSearchParams(body));
        }
    });
}

// Create server
const server = http.createServer((req, res) => {
    const url = new URL(
        req.url,
        `http://${req.headers.host || "localhost"}`
    );

    res.setHeader("Content-Type", "text/html; charset=utf-8");

    // GET: Display the playlist page
    if (req.method === "GET" && url.pathname === "/") {
        const message = url.searchParams.get("message") || "";
        const type = url.searchParams.get("type") === "error"
            ? "error" : "success";

        const songCards = songs.length
            ? songs.map(song => `
                <div class="song">
                    <div class="music-icon">♫</div>
                    <div class="details">
                        <strong>${escapeHTML(song.title)}</strong>
                        <p>${escapeHTML(song.artist)}</p>
                        <small>
                            ${escapeHTML(song.genre)} ·
                            ${escapeHTML(song.duration)} seconds
                        </small>
                    </div>
                    <form action="/delete" method="POST">
                        <input type="hidden" name="id"
                            value="${song.id}">
                        <button class="delete" type="submit">
                            Remove
                        </button>
                    </form>
                </div>
            `).join("")
            : `<p class="empty">No songs yet. Add your first song!</p>`;

        res.writeHead(200);
        res.end(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport"
                    content="width=device-width, initial-scale=1.0">
                <title>TuneTrack</title>
                <style>
                    * { box-sizing: border-box; }

                    body {
                        margin: 0;
                        font-family: Arial, sans-serif;
                        background: #10111b;
                        color: #f8fafc;
                        padding: 30px 16px;
                    }

                    .container {
                        max-width: 850px;
                        margin: auto;
                    }

                    header {
                        text-align: center;
                        margin-bottom: 30px;
                    }

                    header h1 {
                        color: #a78bfa;
                        font-size: 36px;
                        margin-bottom: 8px;
                    }

                    .panel {
                        background: #1c1d2b;
                        padding: 24px;
                        border-radius: 14px;
                        margin-bottom: 22px;
                    }

                    h2 { margin-top: 0; }

                    label {
                        display: block;
                        margin: 14px 0 6px;
                    }

                    input, select {
                        width: 100%;
                        padding: 12px;
                        border-radius: 7px;
                        border: 1px solid #45465a;
                        background: #11121c;
                        color: white;
                    }

                    button {
                        padding: 11px 16px;
                        border: none;
                        border-radius: 7px;
                        cursor: pointer;
                        font-weight: bold;
                    }

                    .add {
                        width: 100%;
                        margin-top: 20px;
                        background: #8b5cf6;
                        color: white;
                    }

                    .song {
                        display: flex;
                        align-items: center;
                        gap: 14px;
                        padding: 15px 0;
                        border-bottom: 1px solid #393a4b;
                    }

                    .music-icon {
                        font-size: 25px;
                        color: #a78bfa;
                    }

                    .details { flex: 1; min-width: 0; }
                    .details p { margin: 5px 0; color: #cbd5e1; }
                    .details small { color: #a1a1aa; }

                    .delete {
                        background: #ef4444;
                        color: white;
                    }

                    .success { color: #4ade80; }
                    .error { color: #f87171; }
                    .empty { color: #cbd5e1; }

                    @media (max-width: 480px) {
                        .song { gap: 8px; }
                        .delete { padding: 9px; }
                    }
                </style>
            </head>
            <body>
                <main class="container">
                    <header>
                        <h1>♫ TuneTrack</h1>
                        <p>Your music, your playlist.</p>
                    </header>

                    <section class="panel">
                        <h2>Add a Song</h2>

                        ${message ? `
                            <p class="${type}">
                                ${escapeHTML(message)}
                            </p>
                        ` : ""}

                        <form action="/songs" method="POST">
                            <label for="title">Song Title</label>
                            <input id="title" name="title"
                                maxlength="80" required>

                            <label for="artist">Artist Name</label>
                            <input id="artist" name="artist"
                                maxlength="60" required>

                            <label for="genre">Genre</label>
                            <select id="genre" name="genre" required>
                                <option value="">Choose genre</option>
                                <option>Pop</option>
                                <option>Rock</option>
                                <option>Hip-Hop</option>
                                <option>Classical</option>
                                <option>Jazz</option>
                                <option>Electronic</option>
                                <option>Other</option>
                            </select>

                            <label for="duration">
                                Duration (seconds)
                            </label>
                            <input id="duration" name="duration"
                                type="number" min="1" max="3600"
                                required>

                            <button class="add" type="submit">
                                + Add to Playlist
                            </button>
                        </form>
                    </section>

                    <section class="panel">
                        <h2>My Playlist (${songs.length})</h2>
                        ${songCards}
                    </section>
                </main>
            </body>
            </html>
        `);
    }

    // POST: Add a song
    else if (req.method === "POST" && url.pathname === "/songs") {
        readBody(req, res, data => {
            const title = (data.get("title") || "").trim();
            const artist = (data.get("artist") || "").trim();
            const genre = (data.get("genre") || "").trim();
            const durationText = (data.get("duration") || "").trim();
            const duration = Number(durationText);

            const allowedGenres = [
                "Pop", "Rock", "Hip-Hop", "Classical",
                "Jazz", "Electronic", "Other"
            ];

            let errors = [];

            if (title.length < 1 || title.length > 80) {
                errors.push("Title must contain 1-80 characters.");
            }

            if (artist.length < 1 || artist.length > 60) {
                errors.push("Artist must contain 1-60 characters.");
            }

            if (!allowedGenres.includes(genre)) {
                errors.push("Please select a valid genre.");
            }

            if (
                durationText === "" ||
                !Number.isInteger(duration) ||
                duration < 1 ||
                duration > 3600
            ) {
                errors.push(
                    "Duration must be a whole number from 1 to 3600."
                );
            }

            if (errors.length > 0) {
                res.writeHead(400);
                res.end(`
                    <h2>Validation Failed</h2>
                    <ul>${errors.map(error =>
                        `<li>${escapeHTML(error)}</li>`
                    ).join("")}</ul>
                    <a href="/">Go back</a>
                `);
                return;
            }

            songs.push({
                id: nextId++,
                title,
                artist,
                genre,
                duration
            });

            // Redirect to the playlist after successful submission
            res.writeHead(303, {
                Location: "/?message=" +
                    encodeURIComponent("Song added successfully!") +
                    "&type=success"
            });
            res.end();
        });
    }

    // POST: Remove a song
    else if (req.method === "POST" && url.pathname === "/delete") {
        readBody(req, res, data => {
            const idText = data.get("id") || "";
            const id = Number(idText);

            if (!/^\d+$/.test(idText) ||
                !songs.some(song => song.id === id)) {
                res.writeHead(303, {
                    Location: "/?message=" +
                        encodeURIComponent("Song not found.") +
                        "&type=error"
                });
                res.end();
                return;
            }

            songs = songs.filter(song => song.id !== id);

            res.writeHead(303, {
                Location: "/?message=" +
                    encodeURIComponent("Song removed successfully!") +
                    "&type=success"
            });
            res.end();
        });
    }

    // Handle unknown routes
    else {
        res.writeHead(404);
        res.end(`
            <h2>404 - Page Not Found</h2>
            <a href="/">Go to TuneTrack</a>
        `);
    }
});

// Start server
server.listen(PORT, () => {
    console.log(`TuneTrack running at http://localhost:${PORT}`);
});
