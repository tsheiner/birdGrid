// Make sure you've added a config.js file with your API keys
// config.js should contain: 
// const CONFIG = { 
//   PIXABAY_API_KEY: "YOUR_KEY_HERE",
//   UNSPLASH_ACCESS_KEY: "YOUR_UNSPLASH_ACCESS_KEY",
//   UNSPLASH_SECRET_KEY: "YOUR_UNSPLASH_SECRET_KEY", // Not used client-side
//   UNSPLASH_APP_ID: "YOUR_UNSPLASH_APP_ID" // Your app name/id
// };

async function fetchBirdImage(birdName, scientificName) {
    // First try Unsplash API for high-quality images
    try {
        const unsplashResult = await fetchUnsplashImage(birdName, scientificName);
        if (unsplashResult) {
            return unsplashResult;
        }
    } catch (error) {
        console.warn(`Unsplash fetch error for ${birdName}:`, error);
        // Continue to Pixabay as fallback
    }
    
    // Fallback to Pixabay API
    try {
        const pixabayImage = await fetchPixabayImage(birdName);
        if (pixabayImage) {
            return {
                url: pixabayImage,
                attribution: null // Pixabay doesn't require attribution in this context
            };
        }
    } catch (error) {
        console.warn(`Pixabay fetch error for ${birdName}:`, error);
    }
    
    // If both APIs fail or return no results, use placeholder
    return {
        url: `https://placehold.co/300x200?text=${encodeURIComponent(birdName)}`,
        attribution: null
    };
}

async function fetchUnsplashImage(birdName, scientificName) {
    const unsplashAccessKey = CONFIG.UNSPLASH_ACCESS_KEY;
    
    // Try with both common name and scientific name for better results
    // Add "bird" to the query to improve relevance
    const searchTerms = [
        `${birdName} bird`,
        scientificName
    ];
    
    // Try each search term until we find an image
    for (const term of searchTerms) {
        const unsplashURL = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(term)}&per_page=30&orientation=landscape&client_id=${unsplashAccessKey}`;
        
        try {
            const response = await fetch(unsplashURL);
            if (!response.ok) {
                throw new Error(`Unsplash API responded with status: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.results && data.results.length > 0) {
                // Get a random image from the first 5 results (or fewer if less are available)
                const randomIndex = Math.floor(Math.random() * Math.min(data.results.length, 5));
                const photo = data.results[randomIndex];
                
                // Return both the image URL and attribution data required by Unsplash
                return {
                    url: photo.urls.regular,
                    attribution: {
                        name: photo.user.name,
                        username: photo.user.username,
                        link: photo.links.html
                    }
                };
            }
        } catch (error) {
            console.error(`Unsplash search failed for term "${term}":`, error);
        }
    }
    
    return null; // Return null if no images found - will trigger fallback
}

async function fetchPixabayImage(birdName) {
    // Use Pixabay API as fallback
    const pixabayKey = CONFIG.PIXABAY_API_KEY;
    const pixabayURL = `https://pixabay.com/api/?key=${pixabayKey}&q=${encodeURIComponent(birdName + " bird")}&image_type=photo&per_page=20&safesearch=true&order=popular&_random=${Math.random()}`;
    
    try {
        const response = await fetch(pixabayURL);
        if (!response.ok) {
            throw new Error(`Pixabay API responded with status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.hits && data.hits.length > 0) {
            const randomIndex = Math.floor(Math.random() * Math.min(data.hits.length, 5));
            return data.hits[randomIndex].webformatURL;
        }
    } catch (error) {
        console.error(`Pixabay fetch error for ${birdName}:`, error);
    }
    
    return null; // Return null if no images found
}

// Handle refreshing the bird image when clicked
async function refreshBirdImage(imgElement, attributionElement, birdName, scientificName) {
    // Show loading state
    imgElement.src = "https://placehold.co/300x200?text=Loading...";
    
    try {
        const result = await fetchBirdImage(birdName, scientificName);
        imgElement.src = result.url;
        
        // Update attribution if present
        if (attributionElement) {
            if (result.attribution) {
                const { name, username, link } = result.attribution;
                attributionElement.innerHTML = `Photo by <a href="${link}?utm_source=${CONFIG.UNSPLASH_APP_ID}&utm_medium=referral" target="_blank">${name} (@${username})</a> on <a href="https://unsplash.com/?utm_source=${CONFIG.UNSPLASH_APP_ID}&utm_medium=referral" target="_blank">Unsplash</a>`;
                attributionElement.style.display = "block";
            } else {
                attributionElement.style.display = "none";
            }
        }
    } catch (error) {
        console.error(`Failed to refresh image for ${birdName}:`, error);
        imgElement.src = `https://placehold.co/300x200?text=${encodeURIComponent(birdName)}`;
        if (attributionElement) {
            attributionElement.style.display = "none";
        }
    }
}

async function loadBirds() {
    const container = document.getElementById("birds-container");
    container.innerHTML = '<div class="loading">Loading bird data...</div>';

    try {
        const response = await fetch("birds_of_costa_rica.json");
        if (!response.ok) {
            throw new Error(`Failed to fetch bird data: ${response.status}`);
        }
        
        const birdsByCategory = await response.json();
        container.innerHTML = ''; // Clear loading message

        // Process each category of birds
        for (const [category, birds] of Object.entries(birdsByCategory)) {
            // Create category header that spans full width
            const categoryTitle = document.createElement("div");
            categoryTitle.className = "category";
            categoryTitle.innerText = category;
            container.appendChild(categoryTitle);
            
            // Load birds in parallel for better performance
            const birdCardPromises = birds.map(async (bird) => {
                try {
                    const imageResult = await fetchBirdImage(bird.common_name, bird.scientific_name);
                    return createBirdCard(bird.common_name, bird.scientific_name, imageResult);
                } catch (error) {
                    console.error(`Error creating card for ${bird.common_name}:`, error);
                    // Return a card with a placeholder image on error
                    return createBirdCard(
                        bird.common_name, 
                        bird.scientific_name, 
                        { 
                            url: `https://placehold.co/300x200?text=${encodeURIComponent(bird.common_name)}`,
                            attribution: null
                        }
                    );
                }
            });
            
            // Wait for all bird cards in this category to be created
            const birdCards = await Promise.all(birdCardPromises);
            
            // Add all cards to the container
            birdCards.forEach(card => container.appendChild(card));
        }
    } catch (error) {
        console.error("Error loading birds:", error);
        container.innerHTML = `<p class="error">Failed to load bird data. Please try again later.<br>Error: ${error.message}</p>`;
    }
}

// Create a bird card element
function createBirdCard(commonName, scientificName, imageResult) {
    const wikiLink = `https://en.wikipedia.org/wiki/${encodeURIComponent(commonName.replace(/ /g, "_"))}`;
    
    const birdCard = document.createElement("div");
    birdCard.className = "bird-card";
    
    // Create image element
    const img = document.createElement("img");
    img.alt = commonName;
    img.src = imageResult.url;
    img.style.cursor = 'pointer';
    img.title = 'Click to see a different image of this bird';
    
    // Add error handling for image load failures
    img.onerror = function() {
        this.src = `https://placehold.co/300x200?text=${encodeURIComponent(commonName)}`;
        this.onerror = null; // Prevent infinite error handling loops
    };
    
    // Create attribution element
    const attribution = document.createElement("div");
    attribution.className = "image-attribution";
    if (imageResult.attribution) {
        const { name, username, link } = imageResult.attribution;
        attribution.innerHTML = `Photo by <a href="${link}?utm_source=${CONFIG.UNSPLASH_APP_ID}&utm_medium=referral" target="_blank">${name} (@${username})</a> on <a href="https://unsplash.com/?utm_source=${CONFIG.UNSPLASH_APP_ID}&utm_medium=referral" target="_blank">Unsplash</a>`;
    } else {
        attribution.style.display = "none";
    }
    
    // Create link element
    const link = document.createElement("a");
    link.href = wikiLink;
    link.target = "_blank";
    link.textContent = commonName;
    
    // Create scientific name element
    const scientificElem = document.createElement("div");
    scientificElem.className = "scientific-name";
    scientificElem.textContent = scientificName;
    
    // Add click event to refresh the image
    img.addEventListener('click', () => {
        refreshBirdImage(img, attribution, commonName, scientificName);
    });
    
    // Assemble the card
    birdCard.appendChild(img);
    birdCard.appendChild(attribution);
    birdCard.appendChild(link);
    birdCard.appendChild(scientificElem);
    
    return birdCard;
}

// Setup search/filtering functionality
function setupFiltering() {
    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.placeholder = 'Filter birds...';
    searchInput.className = 'search-input';
    document.body.insertBefore(searchInput, document.getElementById('birds-container'));
    
    searchInput.addEventListener('input', function() {
        const filter = this.value.toLowerCase();
        const cards = document.querySelectorAll('.bird-card');
        const categories = document.querySelectorAll('.category');
        
        // Create a map to track which categories have visible birds
        const categoryVisibility = new Map();
        categories.forEach(cat => categoryVisibility.set(cat, false));
        
        // Track the last seen category for each card
        let currentCategory = null;
        
        // Check each element in the DOM
        Array.from(document.getElementById('birds-container').children).forEach(element => {
            if (element.classList.contains('category')) {
                currentCategory = element;
                // Initially hide all categories
                element.style.display = 'none';
            } else if (element.classList.contains('bird-card')) {
                const birdName = element.querySelector('a').textContent.toLowerCase();
                const scientificName = element.querySelector('.scientific-name').textContent.toLowerCase();
                
                // Show bird if either common or scientific name matches
                const isVisible = birdName.includes(filter) || scientificName.includes(filter);
                element.style.display = isVisible ? '' : 'none';
                
                // If this bird is visible, its category should be visible too
                if (isVisible && currentCategory) {
                    categoryVisibility.set(currentCategory, true);
                }
            }
        });
        
        // Update category visibility based on whether they have visible birds
        categoryVisibility.forEach((isVisible, category) => {
            category.style.display = isVisible ? '' : 'none';
        });
    });
}

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    loadBirds();
    setupFiltering();
});