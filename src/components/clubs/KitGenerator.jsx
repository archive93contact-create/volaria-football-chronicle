import React from 'react';

/**
 * SVG Kit Generator Component
 * Generates football/soccer kits with various patterns based on club colors
 */
export default function KitGenerator({ 
    primaryColor = '#FF0000', 
    secondaryColor = '#FFFFFF',
    pattern = 'solid',
    crestUrl = null,
    type = 'home', // home, away, third
    size = 'medium' // small, medium, large
}) {
    const dimensions = {
        small: { width: 120, height: 160 },
        medium: { width: 180, height: 240 },
        large: { width: 240, height: 320 }
    };

    const { width, height } = dimensions[size] || dimensions.medium;
    const crestSize = size === 'small' ? 24 : size === 'large' ? 40 : 32;

    // Pattern definitions
    const renderPattern = () => {
        switch (pattern) {
            case 'vertical_stripes':
                return (
                    <>
                        <rect x="0" y="0" width={width} height={height} fill={primaryColor} />
                        <rect x={width * 0.15} y="0" width={width * 0.15} height={height} fill={secondaryColor} />
                        <rect x={width * 0.45} y="0" width={width * 0.15} height={height} fill={secondaryColor} />
                        <rect x={width * 0.75} y="0" width={width * 0.15} height={height} fill={secondaryColor} />
                    </>
                );
            
            case 'horizontal_hoops':
                return (
                    <>
                        <rect x="0" y="0" width={width} height={height} fill={primaryColor} />
                        <rect x="0" y={height * 0.15} width={width} height={height * 0.12} fill={secondaryColor} />
                        <rect x="0" y={height * 0.38} width={width} height={height * 0.12} fill={secondaryColor} />
                        <rect x="0" y={height * 0.61} width={width} height={height * 0.12} fill={secondaryColor} />
                        <rect x="0" y={height * 0.84} width={width} height={height * 0.12} fill={secondaryColor} />
                    </>
                );
            
            case 'sash':
                return (
                    <>
                        <rect x="0" y="0" width={width} height={height} fill={primaryColor} />
                        <polygon 
                            points={`0,${height * 0.25} ${width},${height * 0.45} ${width},${height * 0.65} 0,${height * 0.45}`}
                            fill={secondaryColor}
                        />
                    </>
                );
            
            case 'diagonal_stripe':
                return (
                    <>
                        <rect x="0" y="0" width={width} height={height} fill={primaryColor} />
                        <polygon 
                            points={`${width * 0.3},0 ${width * 0.6},0 ${width},${height * 0.7} ${width},${height} ${width * 0.7},${height} 0,${height * 0.3}`}
                            fill={secondaryColor}
                        />
                    </>
                );
            
            case 'halves':
                return (
                    <>
                        <rect x="0" y="0" width={width / 2} height={height} fill={primaryColor} />
                        <rect x={width / 2} y="0" width={width / 2} height={height} fill={secondaryColor} />
                    </>
                );
            
            case 'quarters':
                return (
                    <>
                        <rect x="0" y="0" width={width / 2} height={height / 2} fill={primaryColor} />
                        <rect x={width / 2} y="0" width={width / 2} height={height / 2} fill={secondaryColor} />
                        <rect x="0" y={height / 2} width={width / 2} height={height / 2} fill={secondaryColor} />
                        <rect x={width / 2} y={height / 2} width={width / 2} height={height / 2} fill={primaryColor} />
                    </>
                );
            
            case 'solid':
            default:
                return <rect x="0" y="0" width={width} height={height} fill={primaryColor} />;
        }
    };

    // Kit outline shape (simplified jersey)
    const kitPath = `
        M ${width * 0.1} ${height * 0.08}
        L ${width * 0.3} ${height * 0.08}
        L ${width * 0.35} ${height * 0.15}
        L ${width * 0.42} ${height * 0.15}
        L ${width * 0.42} ${height * 0.6}
        L ${width * 0.58} ${height * 0.6}
        L ${width * 0.58} ${height * 0.15}
        L ${width * 0.65} ${height * 0.15}
        L ${width * 0.7} ${height * 0.08}
        L ${width * 0.9} ${height * 0.08}
        L ${width * 0.95} ${height * 0.2}
        L ${width * 0.85} ${height * 0.35}
        L ${width * 0.85} ${height * 0.95}
        L ${width * 0.15} ${height * 0.95}
        L ${width * 0.15} ${height * 0.35}
        L ${width * 0.05} ${height * 0.2}
        Z
    `;

    return (
        <svg 
            width={width} 
            height={height} 
            viewBox={`0 0 ${width} ${height}`}
            xmlns="http://www.w3.org/2000/svg"
            style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))' }}
        >
            <defs>
                <clipPath id={`kit-shape-${type}`}>
                    <path d={kitPath} />
                </clipPath>
                <filter id="shadow">
                    <feDropShadow dx="0" dy="1" stdDeviation="2" floodOpacity="0.3"/>
                </filter>
            </defs>
            
            {/* Pattern background - clipped to kit shape */}
            <g clipPath={`url(#kit-shape-${type})`}>
                {renderPattern()}
                
                {/* Kit details/shading */}
                <rect 
                    x={width * 0.42} 
                    y={height * 0.15} 
                    width={width * 0.16} 
                    height={height * 0.45} 
                    fill="#000000" 
                    opacity="0.05" 
                />
            </g>
            
            {/* Kit outline */}
            <path 
                d={kitPath} 
                fill="none" 
                stroke="#000000" 
                strokeWidth="1.5" 
                opacity="0.15"
            />
            
            {/* Club crest */}
            {crestUrl && (
                <image
                    href={crestUrl}
                    x={width * 0.5 - crestSize / 2}
                    y={height * 0.25}
                    width={crestSize}
                    height={crestSize}
                    style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.2))' }}
                />
            )}
        </svg>
    );
}

/**
 * Kit Display Component - Shows all three kits
 */
export function KitDisplay({ club }) {
    const patterns = ['solid', 'vertical_stripes', 'horizontal_hoops', 'sash', 'diagonal_stripe', 'halves', 'quarters'];
    const pattern = club.pattern_preference || 'solid';
    
    // Generate away kit colors (invert primary/secondary)
    const awayPrimary = club.secondary_color || '#FFFFFF';
    const awaySecondary = club.primary_color || '#000000';
    
    // Generate third kit colors (use accent if available, otherwise dark alternative)
    const thirdPrimary = club.accent_color || '#1a1a1a';
    const thirdSecondary = club.secondary_color || '#FFFFFF';

    return (
        <div className="flex gap-6 items-center justify-center flex-wrap">
            <div className="text-center">
                <KitGenerator
                    primaryColor={club.primary_color}
                    secondaryColor={club.secondary_color}
                    pattern={pattern}
                    crestUrl={club.logo_url}
                    type="home"
                    size="medium"
                />
                <div className="text-sm font-medium text-slate-700 mt-2">Home Kit</div>
            </div>
            <div className="text-center">
                <KitGenerator
                    primaryColor={awayPrimary}
                    secondaryColor={awaySecondary}
                    pattern={pattern}
                    crestUrl={club.logo_url}
                    type="away"
                    size="medium"
                />
                <div className="text-sm font-medium text-slate-700 mt-2">Away Kit</div>
            </div>
            <div className="text-center">
                <KitGenerator
                    primaryColor={thirdPrimary}
                    secondaryColor={thirdSecondary}
                    pattern={pattern === 'solid' ? 'vertical_stripes' : 'solid'}
                    crestUrl={club.logo_url}
                    type="third"
                    size="medium"
                />
                <div className="text-sm font-medium text-slate-700 mt-2">Third Kit</div>
            </div>
        </div>
    );
}