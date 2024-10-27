// API Keys and Constants
const SPOTIFY_CLIENT_ID = '6d5cbc6a56b547c7b960bad581ecbe29';
const SPOTIFY_CLIENT_SECRET = '0989e2e553c74877b4896dc0b1f2ef78';
const YOUTUBE_API_KEY = 'AIzaSyDUDQVH3tDNeDATxcNDSgIcvfW6HKHtG7U';

// DOM Elements
const loadingScreen = document.getElementById('loading-screen');
const songsContainer = document.getElementById('songs-container');
const searchInput = document.getElementById('search-input');
const navButtons = document.querySelectorAll('.nav-btn');

// State
let songs = [];
let activeTab = 'home';
let spotifyAccessToken = '';
let nextOffset = 0;

// Spotify Authentication
async function getSpotifyAccessToken() {
    try {
        const response = await fetch('https://accounts.spotify.com/api/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': 'Basic ' + btoa(SPOTIFY_CLIENT_ID + ':' + SPOTIFY_CLIENT_SECRET)
            },
            body: 'grant_type=client_credentials'
        });
        const data = await response.json();
        return data.access_token;
    } catch (error) {
        console.error('Error getting Spotify access token:', error);
        return null;
    }
}

// Fetch Trending Songs with Infinite Scroll
async function loadTrendingSongs() {
    try {
        const response = await fetch(`https://api.spotify.com/v1/playlists/37i9dQZEVXbMDoHDwVN2tF/tracks?offset=${nextOffset}&limit=10`, {
            headers: { 'Authorization': `Bearer ${spotifyAccessToken}` }
        });
        const data = await response.json();
        const newSongs = await Promise.all(data.items.map(async item => {
            const youtubeId = await getYouTubeVideoId(item.track.name, item.track.artists[0].name);
            return {
                id: item.track.id,
                title: item.track.name,
                artist: item.track.artists[0].name,
                releaseDate: item.track.album.release_date,
                albumImageUrl: item.track.album.images[0].url,
                spotifyUrl: item.track.external_urls.spotify,
                youtubeId
            };
        }));
        songs = [...songs, ...newSongs];
        renderSongs();
        nextOffset += 10;
    } catch (error) {
        console.error('Error loading trending songs:', error);
    }
}

// Fetch Random Songs for Library
async function loadLibrarySongs() {
    // Similar to loadTrendingSongs but uses a random offset to load new songs
    songs = []; // Clear existing songs
    await loadTrendingSongs(); // Load new random songs
}

// Fetch Upcoming Events (Dummy Data)
function loadEvents() {
    songs = [
        { title: 'Concert at Central Park', artist: 'Various Artists', releaseDate: 'Tomorrow', youtubeId: null }
    ];
    renderSongs();
}

// Fetch Top Artists
async function loadTopArtists() {
    try {
        const response = await fetch('https://api.spotify.com/v1/artists', {
            headers: { 'Authorization': `Bearer ${spotifyAccessToken}` }
        });
        const data = await response.json();
        songs = data.artists.map(artist => ({
            title: artist.name,
            artist: '',
            releaseDate: '',
            albumImageUrl: artist.images[0].url || '',
            youtubeId: null
        }));
        renderSongs();
    } catch (error) {
        console.error('Error loading artists:', error);
    }
}

async function getYouTubeVideoId(songTitle, artist) {
    try {
        const query = encodeURIComponent(`${songTitle} ${artist} official music video`);
        const response = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&q=${query}&type=video&key=${YOUTUBE_API_KEY}&maxResults=1`);
        const data = await response.json();

        if (response.status === 403) {
            console.error("403 Forbidden: Check API key permissions or quota limits.");
        }

        if (data.items && data.items.length > 0) {
            return data.items[0].id.videoId || null;
        } else {
            console.warn(`No video found for ${songTitle} by ${artist}`);
            return null;
        }
    } catch (error) {
        console.error('Error fetching YouTube video:', error);
        return null;
    }
}



// Create Song Card
function createSongCard(song) {
    const card = document.createElement('div');
    card.className = 'song-card';
    card.innerHTML = `
        <div class="p-4 flex items-center space-x-4">
            <img src="${song.albumImageUrl}" alt="${song.title} album cover" class="w-12 h-12 rounded-md" />
            <div>
                <h3 class="text-white text-lg font-bold mb-1">${song.title}</h3>
                <p class="text-gray-400 text-sm mb-2">${song.artist}</p>
                <p class="text-gray-500 text-xs mb-4">${song.releaseDate}</p>
            </div>
        </div>
        <div class="video-container mb-4">
            ${song.youtubeId ? `
                <iframe src="https://www.youtube.com/embed/${song.youtubeId}" allowfullscreen></iframe>
            ` : `<div class="bg-gray-800 text-white text-center py-4">Video unavailable</div>`}
        </div>
        <a href="${song.spotifyUrl}" target="_blank" rel="noopener noreferrer" class="inline-block bg-green-500 text-white px-4 py-2 rounded-full hover:bg-green-600 transition-colors">Open in Spotify</a>
    `;
    return card;
}

// Render Songs
function renderSongs() {
    songsContainer.innerHTML = '';
    songs.forEach(song => {
        songsContainer.appendChild(createSongCard(song));
    });
}

// Handle Navigation and Search
navButtons.forEach(button => button.addEventListener('click', async event => {
    navButtons.forEach(btn => btn.classList.remove('active'));
    button.classList.add('active');
    activeTab = button.getAttribute('data-tab');
    songs = [];  // Clear existing songs
    if (activeTab === 'trending') await loadTrendingSongs();
    else if (activeTab === 'library') await loadLibrarySongs();
    else if (activeTab === 'events') loadEvents();
    else if (activeTab === 'artists') await loadTopArtists();
}));

// Initialize
(async function initialize() {
    loadingScreen.classList.remove('hide');
    try {
        spotifyAccessToken = await getSpotifyAccessToken();
        await loadTrendingSongs();
    } finally {
        loadingScreen.classList.add('hide');
    }
})();