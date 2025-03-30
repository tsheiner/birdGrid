// Make sure you've added a config.js file with your API keys
// config.js should contain: 
// const CONFIG = { 
//   PIXABAY_API_KEY: "YOUR_KEY_HERE",
//   UNSPLASH_ACCESS_KEY: "YOUR_UNSPLASH_ACCESS_KEY",
//   UNSPLASH_SECRET_KEY: "YOUR_UNSPLASH_SECRET_KEY", // Not used client-side
//   UNSPLASH_APP_ID: "YOUR_UNSPLASH_APP_ID" // Your app name/id
// };

async function fetchWikipediaImage(birdName) {
    // Format the title for Wikipedia API (capitalize first letter, use underscores)
    const formattedTitle = birdName
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join('_');
    
    try {
        // Try to get the main image using pageimages prop
        const pageImageUrl = `https://en.wikipedia.org/w/api.php?action=query&prop=pageimages&format=json&piprop=original&titles=${encodeURIComponent(formattedTitle)}&origin=*`;
        
        console.log(`Fetching Wikipedia main image for ${birdName}`);
        const response = await fetch(pageImageUrl);
        
        if (!response.ok) {
            throw new Error(`Wikipedia API responded with status: ${response.status}`);
        }
        
        const data = await response.json();
        const pages = data.query.pages;
        const pageId = Object.keys(pages)[0];
        
        // Check if we have a valid page and it has an image
        if (pageId !== '-1' && pages[pageId].original) {
            console.log(`Found Wikipedia main image for ${birdName}`);
            return {
                url: pages[pageId].original.source,
                attribution: {
                    name: "Wikipedia",
                    username: "wikipedia",
                    link: `https://en.wikipedia.org/wiki/${encodeURIComponent(formattedTitle)}`
                },
                source: 'wikipedia'
            };
        }
        
        // If we don't have a main image, try to get all images from the page
        console.log(`No main image found for ${birdName}, trying to get all images`);
        const allImagesUrl = `https://en.wikipedia.org/w/api.php?action=query&generator=images&titles=${encodeURIComponent(formattedTitle)}&prop=imageinfo&iiprop=url&format=json&origin=*`;
        
        const imagesResponse = await fetch(allImagesUrl);
        if (!imagesResponse.ok) {
            throw new Error(`Wikipedia images API responded with status: ${imagesResponse.status}`);
        }
        
        const imagesData = await imagesResponse.json();
        
        // Check if we have any images
        if (imagesData.query && imagesData.query.pages) {
            const images = Object.values(imagesData.query.pages);
            
            // Filter out non-image files and sort by probable relevance
            const relevantImages = images
                .filter(img => {
                    const title = img.title.toLowerCase();
                    return img.imageinfo && 
                           !title.includes('icon') && 
                           !title.includes('logo') && 
                           !title.includes('map') &&
                           !title.includes('wiki') &&
                           (title.endsWith('.jpg') || 
                            title.endsWith('.jpeg') || 
                            title.endsWith('.png'));
                })
                .sort((a, b) => {
                    // Score images based on likely relevance
                    const scoreImage = (img) => {
                        const title = img.title.toLowerCase();
                        let score = 0;
                        
                        // Prefer images with bird name in title
                        const lowerBirdName = birdName.toLowerCase();
                        if (title.includes(lowerBirdName)) score += 10;
                        
                        // Avoid images that are likely not of the bird itself
                        if (title.includes('distribution')) score -= 5;
                        if (title.includes('range')) score -= 5;
                        
                        return score;
                    };
                    
                    return scoreImage(b) - scoreImage(a);
                });
            
            if (relevantImages.length > 0) {
                console.log(`Found ${relevantImages.length} images for ${birdName}, using the most relevant`);
                return {
                    url: relevantImages[0].imageinfo[0].url,
                    attribution: {
                        name: "Wikipedia",
                        username: "wikipedia",
                        link: `https://en.wikipedia.org/wiki/${encodeURIComponent(formattedTitle)}`
                    },
                    source: 'wikipedia'
                };
            }
        }
        
        console.log(`No suitable images found for ${birdName} on Wikipedia`);
        return null;
    } catch (error) {
        console.error(`Error fetching Wikipedia image for ${birdName}:`, error);
        return null;
    }
}

async function fetchBirdImage(birdName, scientificName, preferredSource = null) {
    // If preferredSource is specified, try that source first
    if (preferredSource) {
        try {
            if (preferredSource === 'wikipedia') {
                const wikipediaResult = await fetchWikipediaImage(birdName);
                if (wikipediaResult) {
                    return wikipediaResult;
                }
            } else if (preferredSource === 'unsplash') {
                const unsplashResult = await fetchUnsplashImage(birdName, scientificName);
                if (unsplashResult) {
                    return {
                        ...unsplashResult,
                        source: 'unsplash'
                    };
                }
            } else if (preferredSource === 'pixabay') {
                const pixabayImage = await fetchPixabayImage(birdName, scientificName);
                if (pixabayImage) {
                    return {
                        url: pixabayImage,
                        attribution: null, // Pixabay doesn't require attribution in this context
                        source: 'pixabay'
                    };
                }
            }
        } catch (error) {
            console.warn(`${preferredSource} fetch error for ${birdName}:`, error);
            // Continue to other sources as fallback
        }
    }
    
    // Default flow - try Wikipedia first, then Pixabay, then Unsplash
    
    // Try Wikipedia first
    try {
        const wikipediaResult = await fetchWikipediaImage(birdName);
        if (wikipediaResult) {
            return wikipediaResult;
        }
    } catch (error) {
        console.warn(`Wikipedia fetch error for ${birdName}:`, error);
        // Continue to Pixabay as fallback
    }
    
    // Then try Pixabay
    try {
        const pixabayImage = await fetchPixabayImage(birdName, scientificName);
        if (pixabayImage) {
            return {
                url: pixabayImage,
                attribution: null, // Pixabay doesn't require attribution in this context
                source: 'pixabay'
            };
        }
    } catch (error) {
        console.warn(`Pixabay fetch error for ${birdName}:`, error);
        // Continue to Unsplash as fallback
    }
    
    // Finally try Unsplash
    try {
        const unsplashResult = await fetchUnsplashImage(birdName, scientificName);
        if (unsplashResult) {
            return {
                ...unsplashResult,
                source: 'unsplash'
            };
        }
    } catch (error) {
        console.warn(`Unsplash fetch error for ${birdName}:`, error);
    }
    
    // If all APIs fail or return no results, use placeholder
    return {
        url: `https://placehold.co/300x200?text=${encodeURIComponent(birdName)}`,
        attribution: null,
        source: 'placeholder'
    };
}

async function fetchUnsplashImage(birdName, scientificName) {
    const unsplashAccessKey = CONFIG.UNSPLASH_ACCESS_KEY;
    
    // Create more targeted search terms
    const searchTerms = [
        // Location-specific search for Costa Rica birds
        `${birdName} bird Costa Rica`,
        // Add "exact species" to get more precise results
        `${birdName} bird exact species`,
        // Try with "identification" which often returns field guide type photos
        `${birdName} bird identification`,
        // Scientific name specifically for ornithology/bird photography 
        `${scientificName} bird photo`,
        // Try a search term related to birding/bird watching
        `${birdName} bird watching`,
        // Last resort - just the species name with bird
        `${birdName} bird`
    ];
    
    // Try each search term until we find a suitable image
    for (const term of searchTerms) {
        // Improved API parameters
        const unsplashURL = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(term)}&per_page=30&orientation=landscape&content_filter=high&order_by=relevant&client_id=${unsplashAccessKey}`;
        
        try {
            console.log(`Trying Unsplash search for: ${term}`);
            const response = await fetch(unsplashURL);
            if (!response.ok) {
                throw new Error(`Unsplash API responded with status: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.results && data.results.length > 0) {
                // Filter and score results based on relevance
                const scoredResults = data.results.map(photo => {
                    let score = 0;
                    const description = (photo.description || '').toLowerCase();
                    const altDescription = (photo.alt_description || '').toLowerCase();
                    const tags = photo.tags ? photo.tags.map(tag => tag.title.toLowerCase()) : [];
                    
                    // Check if bird name appears in description or alt text
                    const lowerBirdName = birdName.toLowerCase();
                    const lowerScientificName = scientificName.toLowerCase();
                    
                    // Highest priority: exact match of bird name or scientific name
                    if (description.includes(lowerBirdName) || altDescription.includes(lowerBirdName)) {
                        score += 10;
                    }
                    if (description.includes(lowerScientificName) || altDescription.includes(lowerScientificName)) {
                        score += 15; // Scientific name is even more specific
                    }
                    
                    // Check for bird-related keywords in tags
                    const birdKeywords = ['bird', 'wildlife', 'avian', 'birding', 'ornithology', 'nature'];
                    birdKeywords.forEach(keyword => {
                        if (tags.some(tag => tag.includes(keyword))) {
                            score += 2;
                        }
                    });
                    
                    // Bonus for Costa Rica mention
                    if (description.includes('costa rica') || altDescription.includes('costa rica') || 
                        tags.some(tag => tag.includes('costa rica'))) {
                        score += 5;
                    }
                    
                    // Photos with a higher like count might be better quality
                    score += Math.min(photo.likes / 10, 5); // Cap at 5 points
                    
                    return { photo, score };
                });
                
                // Sort by score, highest first
                scoredResults.sort((a, b) => b.score - a.score);
                
                // Select the highest scoring photo, or if multiple have same high score, pick randomly from top 3
                const topScore = scoredResults[0].score;
                const topResults = scoredResults.filter(result => result.score >= Math.max(topScore - 2, 0));
                const randomIndex = Math.floor(Math.random() * Math.min(topResults.length, 3));
                const selectedResult = topResults[randomIndex];
                
                console.log(`Selected image for ${birdName} with score ${selectedResult.score}`);
                
                // Return both the image URL and attribution data required by Unsplash
                return {
                    url: selectedResult.photo.urls.regular,
                    attribution: {
                        name: selectedResult.photo.user.name,
                        username: selectedResult.photo.user.username,
                        link: selectedResult.photo.links.html
                    }
                };
            }
        } catch (error) {
            console.error(`Unsplash search failed for term "${term}":`, error);
        }
    }
    
    return null; // Return null if no images found
}

// Handle refreshing the bird image when clicked
async function refreshBirdImage(imgElement, attributionElement, birdName, scientificName, sourceIndicator, preferredSource = null) {
    // Show loading state
    imgElement.src = "https://placehold.co/300x200?text=Loading...";
    
    try {
        const result = await fetchBirdImage(birdName, scientificName, preferredSource);
        imgElement.src = result.url;
        
        // Update source indicator
        if (sourceIndicator) {
            sourceIndicator.textContent = `Source: ${result.source || 'unknown'}`;
            sourceIndicator.dataset.source = result.source || 'unknown';
        }
        
        // Update attribution if present
        if (attributionElement) {
            if (result.attribution) {
                if (result.source === 'wikipedia') {
                    attributionElement.innerHTML = `Image from <a href="${result.attribution.link}" target="_blank">Wikipedia</a>`;
                } else if (result.source === 'unsplash') {
                    const { name, username, link } = result.attribution;
                    attributionElement.innerHTML = `Photo by <a href="${link}?utm_source=${CONFIG.UNSPLASH_APP_ID}&utm_medium=referral" target="_blank">${name} (@${username})</a> on <a href="https://unsplash.com/?utm_source=${CONFIG.UNSPLASH_APP_ID}&utm_medium=referral" target="_blank">Unsplash</a>`;
                }
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
        if (sourceIndicator) {
            sourceIndicator.textContent = 'Source: error';
            sourceIndicator.dataset.source = 'error';
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
                    // Default to Wikipedia as first choice
                    const imageResult = await fetchBirdImage(bird.common_name, bird.scientific_name, 'wikipedia');
                    return createBirdCard(bird.common_name, bird.scientific_name, imageResult);
                } catch (error) {
                    console.error(`Error creating card for ${bird.common_name}:`, error);
                    // Return a card with a placeholder image on error
                    return createBirdCard(
                        bird.common_name, 
                        bird.scientific_name, 
                        { 
                            url: `https://placehold.co/300x200?text=${encodeURIComponent(bird.common_name)}`,
                            attribution: null,
                            source: 'placeholder'
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
    img.title = 'Click to try a different image of this bird';
    
    // Add error handling for image load failures
    img.onerror = function() {
        this.src = `https://placehold.co/300x200?text=${encodeURIComponent(commonName)}`;
        this.onerror = null; // Prevent infinite error handling loops
    };
    
    // Create source indicator
    const sourceIndicator = document.createElement("div");
    sourceIndicator.className = "source-indicator";
    sourceIndicator.textContent = `Source: ${imageResult.source || 'unknown'}`;
    sourceIndicator.dataset.source = imageResult.source || 'unknown';
    
    // Create retry buttons container
    const retryContainer = document.createElement("div");
    retryContainer.className = "retry-container";
    
    // Create Wikipedia retry button
    const retryWikipedia = document.createElement("button");
    retryWikipedia.className = "retry-button wikipedia";
    retryWikipedia.textContent = "Wikipedia";
    retryWikipedia.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent triggering the image click event
        refreshBirdImage(img, attribution, commonName, scientificName, sourceIndicator, 'wikipedia');
    });
    
    // Create Unsplash retry button
    const retryUnsplash = document.createElement("button");
    retryUnsplash.className = "retry-button unsplash";
    retryUnsplash.textContent = "Unsplash";
    retryUnsplash.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent triggering the image click event
        refreshBirdImage(img, attribution, commonName, scientificName, sourceIndicator, 'unsplash');
    });
    
    // Create Pixabay retry button
    const retryPixabay = document.createElement("button");
    retryPixabay.className = "retry-button pixabay";
    retryPixabay.textContent = "Pixabay";
    retryPixabay.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent triggering the image click event
        refreshBirdImage(img, attribution, commonName, scientificName, sourceIndicator, 'pixabay');
    });
    
    // Add buttons to container
    retryContainer.appendChild(retryWikipedia);
    retryContainer.appendChild(retryPixabay);
    retryContainer.appendChild(retryUnsplash);
    
    // Create attribution element
    const attribution = document.createElement("div");
    attribution.className = "image-attribution";
    if (imageResult.attribution) {
        if (imageResult.source === 'wikipedia') {
            attribution.innerHTML = `Image from <a href="${imageResult.attribution.link}" target="_blank">Wikipedia</a>`;
        } else if (imageResult.source === 'unsplash') {
            const { name, username, link } = imageResult.attribution;
            attribution.innerHTML = `Photo by <a href="${link}?utm_source=${CONFIG.UNSPLASH_APP_ID}&utm_medium=referral" target="_blank">${name} (@${username})</a> on <a href="https://unsplash.com/?utm_source=${CONFIG.UNSPLASH_APP_ID}&utm_medium=referral" target="_blank">Unsplash</a>`;
        }
        attribution.style.display = "block";
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
        refreshBirdImage(img, attribution, commonName, scientificName, sourceIndicator);
    });
    
    // Assemble the card
    birdCard.appendChild(img);
    birdCard.appendChild(sourceIndicator);
    birdCard.appendChild(retryContainer);
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
}); - will trigger fallback
}

async function fetchPixabayImage(birdName, scientificName) {
    const pixabayKey = CONFIG.PIXABAY_API_KEY;
    
    // Create array of search terms to try
    const searchTerms = [
        // Specific bird + specificity indicator
        `${birdName} bird species`,
        // Location-specific search
        `${birdName} bird Costa Rica`,
        // Try with scientific name
        scientificName,
        // Basic search with bird name
        `${birdName} bird`,
        // Add wild/wildlife for context
        `${birdName} wild bird`
    ];
    
    // Try each search term
    for (const term of searchTerms) {
        const pixabayURL = `https://pixabay.com/api/?key=${pixabayKey}&q=${encodeURIComponent(term)}&image_type=photo&per_page=30&safesearch=true&order=popular&category=animals&editors_choice=true&min_width=800&_random=${Math.random()}`;
        
        try {
            console.log(`Trying Pixabay search for: ${term}`);
            const response = await fetch(pixabayURL);
            if (!response.ok) {
                throw new Error(`Pixabay API responded with status: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.hits && data.hits.length > 0) {
                // Filter and score the results
                const scoredResults = data.hits.map(hit => {
                    let score = 0;
                    const tags = hit.tags.toLowerCase();
                    
                    // Check for bird name in tags
                    const lowerBirdName = birdName.toLowerCase();
                    const lowerScientificName = scientificName.toLowerCase();
                    
                    // Check if tags contain bird name or scientific name
                    if (tags.includes(lowerBirdName)) {
                        score += 10;
                    }
                    if (tags.includes(lowerScientificName)) {
                        score += 15;
                    }
                    
                    // Check for bird-related keywords
                    const birdKeywords = ['bird', 'wildlife', 'avian', 'birding', 'ornithology', 'nature'];
                    birdKeywords.forEach(keyword => {
                        if (tags.includes(keyword)) {
                            score += 2;
                        }
                    });
                    
                    // Bonus for Costa Rica mention
                    if (tags.includes('costa rica')) {
                        score += 5;
                    }
                    
                    // Factors related to image quality and popularity
                    score += Math.min(hit.likes / 50, 3); // Like count (max 3 points)
                    score += hit.imageWidth > 1600 ? 2 : 0; // Higher resolution
                    
                    return { hit, score };
                });
                
                // Sort by score, highest first
                scoredResults.sort((a, b) => b.score - a.score);
                
                // Get top results - either the top 3 or all with a score within 2 points of the highest
                const topScore = scoredResults[0].score;
                const topResults = scoredResults.filter(result => result.score >= Math.max(topScore - 2, 0));
                const randomIndex = Math.floor(Math.random() * Math.min(topResults.length, 3));
                const selectedResult = topResults[randomIndex];
                
                console.log(`Selected Pixabay image for ${birdName} with score ${selectedResult.score}`);
                
                return selectedResult.hit.webformatURL;
            }
        } catch (error) {
            console.error(`Pixabay fetch error for ${birdName} (term: ${term}):`, error);
        }
    }
    
    // Try one more search without constraints if nothing found
    try {
        console.log(`Trying last resort Pixabay search for: ${birdName}`);
        const lastResortURL = `https://pixabay.com/api/?key=${pixabayKey}&q=${encodeURIComponent(birdName)}&image_type=photo&per_page=30&safesearch=true&category=animals`;
        
        const response = await fetch(lastResortURL);
        if (response.ok) {
            const data = await response.json();
            if (data.hits && data.hits.length > 0) {
                const randomIndex = Math.floor(Math.random() * Math.min(data.hits.length, 5));
                return data.hits[randomIndex].webformatURL;
            }
        }
    } catch (error) {
        console.error(`Last resort Pixabay fetch error for ${birdName}:`, error);
    }
    
    return null; // Return null if no images found