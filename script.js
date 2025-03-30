async function fetchWikipediaImage(birdName) {
    // Format the title for Wikipedia API (capitalize first letter, use underscores)
    const formattedTitle = birdName
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join('_');
    
    try {
        // Use prop=pageimages to get the main image with its original size
        // This is the recommended way to get the main/thumbnail image from a Wikipedia page
        const apiUrl = `https://en.wikipedia.org/w/api.php?action=query&prop=pageimages&format=json&formatversion=2&piprop=original&titles=${encodeURIComponent(formattedTitle)}&origin=*`;
        
        console.log(`Fetching Wikipedia image for ${birdName}`);
        const response = await fetch(apiUrl);
        
        if (!response.ok) {
            throw new Error(`Wikipedia API responded with status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Check if we have a valid page with an image
        if (data.query && data.query.pages && data.query.pages.length > 0) {
            const page = data.query.pages[0];
            
            if (page.original && page.original.source) {
                console.log(`Found Wikipedia image for ${birdName}`);
                return {
                    url: page.original.source,
                    link: `https://en.wikipedia.org/wiki/${encodeURIComponent(formattedTitle)}`
                };
            }
        }
        
        // Fallback approach: try to get any images from the page if the main image isn't found
        console.log(`No main image found for ${birdName}, trying to get page images`);
        const imagesUrl = `https://en.wikipedia.org/w/api.php?action=query&generator=images&titles=${encodeURIComponent(formattedTitle)}&prop=imageinfo&iiprop=url&format=json&formatversion=2&origin=*`;
        
        const imagesResponse = await fetch(imagesUrl);
        if (!imagesResponse.ok) {
            throw new Error(`Wikipedia images API responded with status: ${imagesResponse.status}`);
        }
        
        const imagesData = await imagesResponse.json();
        
        // Check if we have any images
        if (imagesData.query && imagesData.query.pages) {
            // Filter and sort images to find the most relevant one
            const relevantImages = imagesData.query.pages
                .filter(img => {
                    const title = img.title.toLowerCase();
                    return title.includes('.jpg') || 
                           title.includes('.jpeg') || 
                           title.includes('.png') || 
                           title.includes('.svg');
                })
                .filter(img => {
                    const title = img.title.toLowerCase();
                    return !title.includes('icon') && 
                           !title.includes('logo') && 
                           !title.includes('map') &&
                           !title.includes('wiki');
                })
                .sort((a, b) => {
                    // Score images based on relevance
                    const scoreImage = (img) => {
                        const title = img.title.toLowerCase();
                        let score = 0;
                        
                        // Prefer images with bird name in title
                        const lowerBirdName = birdName.toLowerCase();
                        if (title.includes(lowerBirdName)) score += 10;
                        
                        // Avoid distribution maps
                        if (title.includes('distribution')) score -= 5;
                        if (title.includes('range')) score -= 5;
                        
                        return score;
                    };
                    
                    return scoreImage(b) - scoreImage(a);
                });
            
            if (relevantImages.length > 0 && relevantImages[0].imageinfo && relevantImages[0].imageinfo.length > 0) {
                console.log(`Found relevant image for ${birdName} from page images`);
                return {
                    url: relevantImages[0].imageinfo[0].url,
                    link: `https://en.wikipedia.org/wiki/${encodeURIComponent(formattedTitle)}`
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

// Create a bird card element
function createBirdCard(commonName, imageInfo) {
    const birdCard = document.createElement("div");
    birdCard.className = "bird-card";
    
    // Create image element
    const img = document.createElement("img");
    img.alt = commonName;
    img.src = imageInfo ? imageInfo.url : `https://placehold.co/300x200?text=${encodeURIComponent(commonName)}`;
    
    // Add error handling for image load failures
    img.onerror = function() {
        this.src = `https://placehold.co/300x200?text=${encodeURIComponent(commonName)}`;
    };
    
    // Create link element
    const link = document.createElement("a");
    link.href = imageInfo ? imageInfo.link : `https://en.wikipedia.org/wiki/${commonName.replace(/ /g, "_")}`;
    link.target = "_blank";
    link.textContent = commonName;
    
    // Assemble the card
    birdCard.appendChild(img);
    birdCard.appendChild(link);
    
    return birdCard;
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
            // Create category header
            const categoryTitle = document.createElement("div");
            categoryTitle.className = "category";
            categoryTitle.innerText = category;
            container.appendChild(categoryTitle);
            
            // Process birds in small batches to avoid overwhelming the API
            // This helps prevent rate limiting issues with Wikipedia's API
            for (let i = 0; i < birds.length; i++) {
                try {
                    const bird = birds[i];
                    const imageInfo = await fetchWikipediaImage(bird.common_name);
                    const card = createBirdCard(bird.common_name, imageInfo);
                    container.appendChild(card);
                    
                    // Add a small delay between API calls to be nice to Wikipedia's servers
                    if (i < birds.length - 1) {
                        await new Promise(resolve => setTimeout(resolve, 200));
                    }
                } catch (error) {
                    console.error(`Error creating card for ${birds[i].common_name}:`, error);
                    const card = createBirdCard(birds[i].common_name, null);
                    container.appendChild(card);
                }
            }
        }
    } catch (error) {
        console.error("Error loading birds:", error);
        container.innerHTML = `<p class="error">Failed to load bird data. Please try again later.</p>`;
    }
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
                
                // Show bird if name matches
                const isVisible = birdName.includes(filter);
                element.style.display = isVisible ? '' : 'none';
                
                // If this bird is visible, its category should be visible too
                if (isVisible && currentCategory) {
                    categoryVisibility.set(currentCategory, true);
                }
            }
        });
        
        // Update category visibility
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