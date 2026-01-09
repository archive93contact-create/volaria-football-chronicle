// Club Narrative Prioritization and Scoring System

export function scoreNarrative(narrative, club, sortedSeasons) {
    let score = 0;
    const title = narrative.title.toLowerCase();
    const text = narrative.text.toLowerCase();
    
    // HIGH PRIORITY (50-100 points)
    // Continental glory
    if (title.includes('continental glory') || title.includes('vcc') || title.includes('treble')) score += 100;
    if (title.includes('continental') && (title.includes('winner') || title.includes('champion'))) score += 90;
    
    // Current status stories (high relevance)
    if (title.includes('fallen giant') || title.includes('fading force')) score += 85;
    
    // Major achievements
    if (title.includes('dynasty') || title.includes('dominant')) score += 80;
    if (title.includes('invincible') || title.includes('record')) score += 75;
    
    // MEDIUM PRIORITY (30-50 points)
    // Historical milestones
    if (title.includes('first') && (title.includes('title') || title.includes('top flight'))) score += 50;
    if (title.includes('double') || title.includes('cup')) score += 45;
    
    // Recent form (last 5 years)
    const recentYear = new Date().getFullYear() - 5;
    const hasRecentMention = sortedSeasons.some(s => {
        const year = parseInt(s.year.split('-')[0]);
        return year >= recentYear && (
            text.includes(s.year) || 
            (s.status === 'champion' && text.includes('champion')) ||
            (s.status === 'promoted' && text.includes('promot'))
        );
    });
    if (hasRecentMention) score += 40;
    
    // Identity/stature
    if (title.includes('stalwart') || title.includes('institution')) score += 35;
    
    // LOW PRIORITY (10-30 points)
    // Lower tier achievements
    if (title.includes('lower league') || text.includes('tier 5')) score += 25;
    
    // Struggles and setbacks
    if (title.includes('relegat') || title.includes('struggle')) score += 20;
    
    // Historical context
    if (title.includes('founding') || title.includes('tradition')) score += 15;
    
    // VERY LOW PRIORITY (0-10 points)
    // Statistical records
    if (title.includes('longevity') || title.includes('goal machine')) score += 10;
    
    return score;
}

export function categorizeNarrative(narrative) {
    const title = narrative.title.toLowerCase();
    
    if (title.includes('glory') || title.includes('champion') || title.includes('title') || 
        title.includes('winner') || title.includes('trophy') || title.includes('double') || 
        title.includes('treble') || title.includes('continental')) {
        return 'glory';
    }
    
    if (title.includes('fallen') || title.includes('relegat') || title.includes('struggle') || 
        title.includes('exile') || title.includes('collapse') || title.includes('fading') ||
        title.includes('farewell') || title.includes('dark')) {
        return 'struggles';
    }
    
    if (title.includes('promot') || title.includes('rise') || title.includes('return') || 
        title.includes('comeback') || title.includes('bounce')) {
        return 'recent_form';
    }
    
    if (title.includes('founding') || title.includes('tradition') || title.includes('heritage') || 
        title.includes('stalwart') || title.includes('institution') || title.includes('roots')) {
        return 'identity';
    }
    
    if (title.includes('yo-yo') || title.includes('rivalry') || title.includes('record') || 
        title.includes('unique')) {
        return 'quirks';
    }
    
    return 'other';
}

export function selectBestNarratives(narratives, club, sortedSeasons, maxNarratives = 10) {
    // Score all narratives
    const scored = narratives.map(n => ({
        ...n,
        score: scoreNarrative(n, club, sortedSeasons),
        category: categorizeNarrative(n)
    }));
    
    // Sort by score
    scored.sort((a, b) => b.score - a.score);
    
    // Ensure diversity - max 3 from each category
    const selected = [];
    const categoryCount = {};
    
    for (const narrative of scored) {
        const cat = narrative.category;
        if (!categoryCount[cat]) categoryCount[cat] = 0;
        
        if (categoryCount[cat] < 3) {
            selected.push(narrative);
            categoryCount[cat]++;
        }
        
        if (selected.length >= maxNarratives) break;
    }
    
    return selected;
}

export function deduplicateNarratives(narratives) {
    const seen = new Set();
    return narratives.filter(n => {
        // Create a key from title words to catch similar narratives
        const key = n.title.toLowerCase().split(' ').slice(0, 3).join(' ');
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}