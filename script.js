// --- State Management ---
let currentQueue = [];
let currentIndex = 0;
let isPlaying = false;
let isShuffle = false;
let isRepeat = false;
let favorites = JSON.parse(localStorage.getItem('arTunesFavorites')) || [];

// --- DOM Elements ---
let audio, miniPlayer, fullPlayer, miniArt, fpArt, fpBg;

// --- Initialization ---
window.addEventListener('DOMContentLoaded', () => {
    // Assign DOM elements after the DOM is loaded
    audio = document.getElementById('audio-player');
    miniPlayer = document.getElementById('mini-player');
    fullPlayer = document.getElementById('full-player');
    miniArt = document.getElementById('mini-art');
    fpArt = document.getElementById('fp-art');
    fpBg = document.getElementById('fp-bg');

    tsParticles.load("tsparticles", {
        fpsLimit: 60,
        particles: {
            number: {
                value: 80,
                density: {
                    enable: true,
                    value_area: 800
                }
            },
            color: {
                value: ["#00a8ff", "#9c88ff", "#fbc531", "#4cd137"]
            },
            shape: {
                type: "circle"
            },
            opacity: {
                value: 0.5,
                random: true,
                anim: {
                    enable: true,
                    speed: 1,
                    opacity_min: 0.1,
                    sync: false
                }
            },
            size: {
                value: 5,
                random: true,
                anim: {
                    enable: true,
                    speed: 2,
                    size_min: 0.1,
                    sync: false
                }
            },
            links: {
                enable: false,
            },
            move: {
                enable: true,
                speed: 2,
                direction: "none",
                random: false,
                straight: false,
                out_mode: "out",
                wobble: {
                    enable: true,
                    distance: 10,
                    speed: 10
                },
                attract: {
                    enable: false,
                }
            }
        },
        interactivity: {
            events: {
                onhover: {
                    enable: true,
                    mode: "bubble"
                },
                onclick: {
                    enable: false,
                }
            },
            modes: {
                bubble: {
                    distance: 200,
                    size: 15,
                    duration: 2,
                    opacity: 1
                }
            }
        },
        retina_detect: true,
    });

    if (document.getElementById('trending-container')) {
        fetchMusic('Bollywood Top', 'trending-container', 'grid');
    }
    if (document.getElementById('new-releases-container')) {
        fetchMusic('Arijit Singh', 'new-releases-container', 'list');
    }
    if (document.getElementById('favorites-list')) {
        renderFavorites();
    }
    if (document.getElementById('search-input')) {
        let timeout = null;
        document.getElementById('search-input').addEventListener('keyup', function(e) {
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                const query = e.target.value;
                if(query.length > 2) searchMusic(query);
            }, 500);
        });
    }

    // Audio Events
    if (audio) {
        audio.addEventListener('timeupdate', updateProgress);
        audio.addEventListener('ended', handleSongEnd);
        document.getElementById('seek-slider').addEventListener('input', function() {
            const time = (this.value / 100) * audio.duration;
            audio.currentTime = time;
        });
    }
});

// --- Navigation ---
function switchTab(tabName) {
    // Hide all pages
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    // Remove active class from nav
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    
    // Activate selected
    if(tabName === 'home') {
        document.getElementById('home-view').classList.add('active');
        document.querySelectorAll('.nav-item')[0].classList.add('active');
    } else if (tabName === 'search') {
        document.getElementById('search-view').classList.add('active');
        document.querySelectorAll('.nav-item')[1].classList.add('active');
    } else if (tabName === 'favorites') {
        renderFavorites(); // Refresh list
        document.getElementById('favorites-view').classList.add('active');
        document.querySelectorAll('.nav-item')[2].classList.add('active');
    }
}

function toggleMenu() {
    document.getElementById('menuDropdown').classList.toggle('active');
}

function openFullPlayer() {
    if(currentQueue.length > 0) fullPlayer.classList.add('active');
}

function closeFullPlayer() {
    fullPlayer.classList.remove('active');
}

// --- API & Data ---
async function fetchMusic(query, containerId, type) {
    const container = document.getElementById(containerId);
    try {
        const res = await fetch(`https://itunes.apple.com/search?term=${query}&media=music&entity=song&limit=20`);
        const data = await res.json();
        renderSongs(data.results, container, type);
    } catch (e) {
        console.error(e);
        container.innerHTML = '<div style="text-align:center; padding:20px;">Failed to load music</div>';
    }
}

async function searchMusic(query) {
    const container = document.getElementById('search-results');
    container.innerHTML = '<div class="loader"><div class="spinner"></div></div>';
    try {
        const [songRes, artistRes, albumRes] = await Promise.all([
            fetch(`https://itunes.apple.com/search?term=${query}&media=music&entity=song&limit=10`),
            fetch(`https://itunes.apple.com/search?term=${query}&media=music&entity=musicArtist&limit=3`),
            fetch(`https://itunes.apple.com/search?term=${query}&media=music&entity=album&limit=5`)
        ]);

        const songData = await songRes.json();
        const artistData = await artistRes.json();
        const albumData = await albumRes.json();

        if (songData.results.length === 0 && artistData.results.length === 0 && albumData.results.length === 0) {
            container.innerHTML = '<div style="text-align:center; padding:20px;">No results found</div>';
        } else {
            renderSearchResults(songData.results, artistData.results, albumData.results, container);
        }
    } catch (e) {
        container.innerHTML = 'Error searching';
    }
}

function getHighResImg(url) {
    return url.replace('100x100bb', '600x600bb');
}

function renderSongs(songs, container, type, isSearch = false) {
    container.innerHTML = '';
    songs.forEach((song, index) => {
        const img = song.artworkUrl100;
        const title = song.trackName;
        const artist = song.artistName;
        
        let html = '';
        
        if (type === 'grid') {
            html = `
            <div class="song-card" onclick="startQueue(${index}, 'grid_trending')">
                <img src="${getHighResImg(img)}" loading="lazy">
                <div class="song-title">${title}</div>
                <div class="song-artist">${artist}</div>
            </div>`;
        } else {
            html = `
            <div class="list-item" onclick="startQueue(${index}, '${isSearch ? 'search' : 'list_new'}')">
                <img src="${img}" loading="lazy">
                <div class="list-info">
                    <div class="song-title">${title}</div>
                    <div class="song-artist">${artist}</div>
                </div>
            </div>`;
        }
        
        const div = document.createElement('div');
        div.innerHTML = html;
        const element = div.firstElementChild;
        
        element.dataset.song = JSON.stringify(song);
        
        container.appendChild(element);
    });

    if(container.id === 'trending-container') window.trendingSongs = songs;
    if(container.id === 'new-releases-container') window.newSongs = songs;
    if(container.id === 'search-results') window.searchSongs = songs;
}

function renderSearchResults(songs, artists, albums, container) {
    container.innerHTML = '';

    if (artists.length > 0) {
        container.innerHTML += '<h2>Artists</h2>';
        artists.forEach(artist => {
            container.innerHTML += `<div class="list-item"><div class="list-info"><div class="song-title">${artist.artistName}</div></div></div>`;
        });
    }

    if (albums.length > 0) {
        container.innerHTML += '<h2>Albums</h2>';
        albums.forEach(album => {
            container.innerHTML += `<div class="list-item"><img src="${album.artworkUrl100}" loading="lazy"><div class="list-info"><div class="song-title">${album.collectionName}</div><div class="song-artist">${album.artistName}</div></div></div>`;
        });
    }

    if (songs.length > 0) {
        container.innerHTML += '<h2>Songs</h2>';
        renderSongs(songs, container, 'list', true);
    }
}

function renderFavorites() {
    const container = document.getElementById('favorites-list');
    if (favorites.length === 0) {
        container.innerHTML = '<div style="text-align: center; color: var(--text-muted); margin-top: 50px;">No favorites yet!</div>';
        return;
    }
    renderSongs(favorites, container, 'list');
}


// --- Playback Logic ---

function startQueue(index, source) {
    let sourceArray = [];
    if(source === 'grid_trending') sourceArray = window.trendingSongs;
    else if(source === 'list_new') sourceArray = window.newSongs;
    else if(source === 'search') sourceArray = window.searchSongs;
    else if(source === 'favorites') sourceArray = favorites;

    if(sourceArray && sourceArray.length > 0) {
        currentQueue = [...sourceArray];
        if(isShuffle) shuffleQueue();
        currentIndex = index;
        playSong(currentQueue[currentIndex]);
    }
}

function playSong(song) {
    if(!song) return;

    audio.src = song.previewUrl;
    audio.play();
    isPlaying = true;

    updatePlayerUI(song);
    miniPlayer.classList.add('visible');
    
    updatePlayPauseIcons();
    
    document.querySelectorAll('.list-item').forEach(item => item.classList.remove('playing'));
}

function updatePlayerUI(song) {
    const highRes = getHighResImg(song.artworkUrl100);
    
    miniArt.src = highRes;
    document.getElementById('mini-title').innerText = song.trackName;
    document.getElementById('mini-artist').innerText = song.artistName;

    fpArt.src = highRes;
    fpBg.style.backgroundImage = `url(${highRes})`;
    document.getElementById('fp-title').innerText = song.trackName;
    document.getElementById('fp-artist').innerText = song.artistName;

    const isFav = favorites.some(f => f.trackId === song.trackId);
    const likeBtn = document.getElementById('fp-like-btn').querySelector('i');
    if(isFav) {
        likeBtn.className = 'ri-heart-fill filled';
    } else {
        likeBtn.className = 'ri-heart-line';
    }
}

function togglePlay() {
    if(audio.src) {
        if(audio.paused) {
            audio.play();
            isPlaying = true;
        } else {
            audio.pause();
            isPlaying = false;
        }
        updatePlayPauseIcons();
    }
}

function updatePlayPauseIcons() {
    const miniBtn = document.getElementById('mini-play-btn').querySelector('i');
    const fpBtn = document.getElementById('fp-play-btn').querySelector('i');

    if(isPlaying) {
        miniBtn.className = 'ri-pause-fill';
        fpBtn.className = 'ri-pause-fill';
        miniArt.classList.add('playing');
        fpArt.classList.add('playing');
    } else {
        miniBtn.className = 'ri-play-fill';
        fpBtn.className = 'ri-play-fill';
        miniArt.classList.remove('playing');
        fpArt.classList.remove('playing');
    }
}

function playNext() {
    if(currentQueue.length === 0) return;
    
    if(isShuffle) {
        currentIndex = Math.floor(Math.random() * currentQueue.length);
    } else {
        currentIndex = (currentIndex + 1) % currentQueue.length;
    }
    playSong(currentQueue[currentIndex]);
}

function playPrev() {
    if(currentQueue.length === 0) return;

    if(isShuffle) {
        currentIndex = Math.floor(Math.random() * currentQueue.length);
    } else {
        currentIndex = (currentIndex - 1 + currentQueue.length) % currentQueue.length;
    }
    playSong(currentQueue[currentIndex]);
}

function handleSongEnd() {
    if(isRepeat) {
        playSong(currentQueue[currentIndex]);
    } else {
        playNext();
    }
}

function updateProgress() {
    const { duration, currentTime } = audio;
    const progressPercent = (currentTime / duration) * 100;
    document.getElementById('seek-slider').value = progressPercent;

    document.getElementById('curr-time').innerText = formatTime(currentTime);
    if(duration) {
        document.getElementById('total-time').innerText = formatTime(duration);
    }
}

function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${minutes}:${secs}`;
}

function toggleShuffle() {
    isShuffle = !isShuffle;
    document.getElementById('shuffle-btn').classList.toggle('active', isShuffle);
    showToast(isShuffle ? 'Shuffle On' : 'Shuffle Off');
}

function toggleRepeat() {
    isRepeat = !isRepeat;
    document.getElementById('repeat-btn').classList.toggle('active', isRepeat);
    showToast(isRepeat ? 'Repeat On' : 'Repeat Off');
}

function toggleFavoriteCurrent() {
    const currentSong = currentQueue[currentIndex];
    if(!currentSong) return;

    const index = favorites.findIndex(f => f.trackId === currentSong.trackId);
    if(index > -1) {
        favorites.splice(index, 1);
        showToast('Removed from Favorites');
    } else {
        favorites.push(currentSong);
        showToast('Added to Favorites');
    }
    localStorage.setItem('arTunesFavorites', JSON.stringify(favorites));
    updatePlayerUI(currentSong);
}

function showToast(message) {
    const toast = document.getElementById('toast');
    toast.innerText = message;
    toast.style.opacity = 1;
    setTimeout(() => {
        toast.style.opacity = 0;
    }, 2000);
}

function shuffleQueue() {
    for (let i = currentQueue.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [currentQueue[i], currentQueue[j]] = [currentQueue[j], currentQueue[i]];
    }
}
