import { useEffect, useRef } from "react";

const MeshBackground = ({ darkMode = true }) => {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;

        if (!canvas) return;

        const ctx = canvas.getContext("2d");

        let width = 0;
        let height = 0;
        let animationFrame;
        let time = 0;

        const mouse = {
            x: -1000,
            y: -1000,
            targetX: -1000,
            targetY: -1000,
        };

        const spacing = 65;
        const warpRadius = 360;
        const warpStrength = 95;

        const resize = () => {
            const dpr = Math.min(
                window.devicePixelRatio || 1,
                2
            );

            width = window.innerWidth;
            height = window.innerHeight;

            canvas.width = width * dpr;
            canvas.height = height * dpr;

            canvas.style.width = `${width}px`;
            canvas.style.height = `${height}px`;

            ctx.setTransform(
                dpr,
                0,
                0,
                dpr,
                0,
                0
            );
        };

        const handleMouseMove = (e) => {
            mouse.targetX = e.clientX;
            mouse.targetY = e.clientY;
        };

        const handleMouseLeave = () => {
            mouse.targetX = -1000;
            mouse.targetY = -1000;
        };

        /*
        ==========================================
        SPACETIME WARP
        ==========================================
        */

        const warpPoint = (x, y) => {
            const dx = x - mouse.x;
            const dy = y - mouse.y;

            const distance = Math.sqrt(
                dx * dx + dy * dy
            );

            if (distance > warpRadius || distance < 1) {
                return {
                    x,
                    y,
                    strength: 0,
                };
            }

            const normalized =
                1 - distance / warpRadius;

            const smooth =
                normalized *
                normalized *
                (3 - 2 * normalized);

            /*
            Creates the feeling that space
            is being pulled around the cursor.
            */

            const wave =
                Math.sin(
                    distance * 0.045 -
                    time * 0.035
                );

            const pull =
                smooth *
                warpStrength *
                (0.55 + wave * 0.2);

            /*
            Slight rotational bending.
            */

            const angle =
                Math.atan2(dy, dx);

            const twist =
                smooth *
                0.45;

            const rotatedAngle =
                angle + twist;

            const newDistance =
                distance - pull;

            return {
                x:
                    mouse.x +
                    Math.cos(rotatedAngle) *
                    newDistance,

                y:
                    mouse.y +
                    Math.sin(rotatedAngle) *
                    newDistance,

                strength: smooth,
            };
        };

        /*
        ==========================================
        BACKGROUND ATMOSPHERE
        ==========================================
        */

        const drawAtmosphere = () => {
            /*
            Very subtle blue/violet atmosphere.
            */

            const gradient =
                ctx.createRadialGradient(
                    width * 0.5,
                    height * 0.45,
                    0,
                    width * 0.5,
                    height * 0.45,
                    Math.max(width, height) * 0.75
                );

            if (darkMode) {
                gradient.addColorStop(
                    0,
                    "rgba(30,64,175,0.045)"
                );

                gradient.addColorStop(
                    0.45,
                    "rgba(109,40,217,0.025)"
                );

                gradient.addColorStop(
                    1,
                    "rgba(0,0,0,0)"
                );
            } else {
                gradient.addColorStop(
                    0,
                    "rgba(37,99,235,0.045)"
                );

                gradient.addColorStop(
                    0.45,
                    "rgba(124,58,237,0.025)"
                );

                gradient.addColorStop(
                    1,
                    "rgba(255,255,255,0)"
                );
            }

            ctx.fillStyle = gradient;

            ctx.fillRect(
                0,
                0,
                width,
                height
            );
        };

        /*
        ==========================================
        WARPED HORIZONTAL SPACE LINES
        ==========================================
        */

        const drawHorizontalLines = () => {
            for (
                let baseY = -spacing;
                baseY <= height + spacing;
                baseY += spacing
            ) {
                ctx.beginPath();

                for (
                    let x = -50;
                    x <= width + 50;
                    x += 12
                ) {
                    /*
                    Gentle natural movement.
                    */

                    const ambient =
                        Math.sin(
                            x * 0.006 +
                            time * 0.008 +
                            baseY * 0.01
                        ) * 5;

                    const originalY =
                        baseY + ambient;

                    const point =
                        warpPoint(
                            x,
                            originalY
                        );

                    /*
                    Tiny vertical breathing
                    */

                    const breathing =
                        Math.sin(
                            x * 0.012 +
                            time * 0.012
                        ) * 2;

                    const finalY =
                        point.y + breathing;

                    if (x === -50) {
                        ctx.moveTo(
                            point.x,
                            finalY
                        );
                    } else {
                        ctx.lineTo(
                            point.x,
                            finalY
                        );
                    }
                }

                const gradient =
                    ctx.createLinearGradient(
                        0,
                        0,
                        width,
                        0
                    );

                if (darkMode) {
                    gradient.addColorStop(
                        0,
                        "rgba(96,165,250,0.025)"
                    );

                    gradient.addColorStop(
                        0.35,
                        "rgba(129,140,248,0.055)"
                    );

                    gradient.addColorStop(
                        0.55,
                        "rgba(167,139,250,0.07)"
                    );

                    gradient.addColorStop(
                        0.75,
                        "rgba(34,211,238,0.045)"
                    );

                    gradient.addColorStop(
                        1,
                        "rgba(96,165,250,0.025)"
                    );
                } else {
                    gradient.addColorStop(
                        0,
                        "rgba(30,64,175,0.045)"
                    );

                    gradient.addColorStop(
                        0.35,
                        "rgba(79,70,229,0.085)"
                    );

                    gradient.addColorStop(
                        0.55,
                        "rgba(109,40,217,0.09)"
                    );

                    gradient.addColorStop(
                        0.75,
                        "rgba(14,116,144,0.065)"
                    );

                    gradient.addColorStop(
                        1,
                        "rgba(30,64,175,0.045)"
                    );
                }

                ctx.strokeStyle = gradient;

                ctx.lineWidth = 1;

                ctx.stroke();
            }
        };

        /*
        ==========================================
        WARPED VERTICAL LINES
        ==========================================
        */

        const drawVerticalLines = () => {
            for (
                let baseX = -spacing;
                baseX <= width + spacing;
                baseX += spacing
            ) {
                ctx.beginPath();

                for (
                    let y = -50;
                    y <= height + 50;
                    y += 12
                ) {
                    const ambient =
                        Math.sin(
                            y * 0.006 +
                            time * 0.006 +
                            baseX * 0.01
                        ) * 5;

                    const originalX =
                        baseX + ambient;

                    const point =
                        warpPoint(
                            originalX,
                            y
                        );

                    const breathing =
                        Math.sin(
                            y * 0.01 +
                            time * 0.01
                        ) * 2;

                    const finalX =
                        point.x + breathing;

                    if (y === -50) {
                        ctx.moveTo(
                            finalX,
                            point.y
                        );
                    } else {
                        ctx.lineTo(
                            finalX,
                            point.y
                        );
                    }
                }

                const gradient =
                    ctx.createLinearGradient(
                        0,
                        0,
                        0,
                        height
                    );

                if (darkMode) {
                    gradient.addColorStop(
                        0,
                        "rgba(59,130,246,0.02)"
                    );

                    gradient.addColorStop(
                        0.5,
                        "rgba(139,92,246,0.055)"
                    );

                    gradient.addColorStop(
                        1,
                        "rgba(34,211,238,0.025)"
                    );
                } else {
                    gradient.addColorStop(
                        0,
                        "rgba(30,64,175,0.04)"
                    );

                    gradient.addColorStop(
                        0.5,
                        "rgba(109,40,217,0.075)"
                    );

                    gradient.addColorStop(
                        1,
                        "rgba(14,116,144,0.04)"
                    );
                }

                ctx.strokeStyle = gradient;

                ctx.lineWidth = 1;

                ctx.stroke();
            }
        };

        /*
        ==========================================
        GRAVITY RINGS
        ==========================================
        */

        const drawGravityRings = () => {
            if (
                mouse.x < -500 ||
                mouse.y < -500
            ) {
                return;
            }

            const rings = 7;

            for (let i = 0; i < rings; i++) {
                const radius =
                    45 +
                    i * 42 +
                    Math.sin(
                        time * 0.025 + i
                    ) * 3;

                ctx.beginPath();

                /*
                Slightly imperfect circles
                so they feel like warped space.
                */

                for (
                    let angle = 0;
                    angle <= Math.PI * 2.05;
                    angle += 0.035
                ) {
                    const distortion =
                        Math.sin(
                            angle * 3 +
                            time * 0.02
                        ) * 5;

                    const r =
                        radius +
                        distortion;

                    const x =
                        mouse.x +
                        Math.cos(angle) * r;

                    const y =
                        mouse.y +
                        Math.sin(angle) *
                        r *
                        0.72;

                    const point =
                        warpPoint(x, y);

                    if (angle === 0) {
                        ctx.moveTo(
                            point.x,
                            point.y
                        );
                    } else {
                        ctx.lineTo(
                            point.x,
                            point.y
                        );
                    }
                }

                ctx.strokeStyle =
                    darkMode
                        ? `rgba(129,140,248,${0.025 + i * 0.004})`
                        : `rgba(79,70,229,${0.035 + i * 0.005})`;

                ctx.lineWidth = 1;

                ctx.stroke();
            }
        };

        /*
        ==========================================
        CURSOR LIGHT
        ==========================================
        */

        const drawCursorGlow = () => {
            if (
                mouse.x < -500 ||
                mouse.y < -500
            ) {
                return;
            }

            const gradient =
                ctx.createRadialGradient(
                    mouse.x,
                    mouse.y,
                    0,
                    mouse.x,
                    mouse.y,
                    260
                );

            if (darkMode) {
                gradient.addColorStop(
                    0,
                    "rgba(96,165,250,0.12)"
                );

                gradient.addColorStop(
                    0.25,
                    "rgba(139,92,246,0.07)"
                );

                gradient.addColorStop(
                    0.65,
                    "rgba(34,211,238,0.025)"
                );
            } else {
                gradient.addColorStop(
                    0,
                    "rgba(37,99,235,0.10)"
                );

                gradient.addColorStop(
                    0.25,
                    "rgba(124,58,237,0.065)"
                );

                gradient.addColorStop(
                    0.65,
                    "rgba(14,116,144,0.025)"
                );
            }

            gradient.addColorStop(
                1,
                "rgba(0,0,0,0)"
            );

            ctx.fillStyle = gradient;

            ctx.fillRect(
                mouse.x - 260,
                mouse.y - 260,
                520,
                520
            );
        };

        /*
        ==========================================
        MAIN LOOP
        ==========================================
        */

        const draw = () => {
            ctx.clearRect(
                0,
                0,
                width,
                height
            );

            time += 1;

            /*
            Smooth cursor movement
            */

            mouse.x +=
                (mouse.targetX - mouse.x) *
                0.075;

            mouse.y +=
                (mouse.targetY - mouse.y) *
                0.075;

            drawAtmosphere();

            drawHorizontalLines();

            drawVerticalLines();

            drawGravityRings();

            drawCursorGlow();

            animationFrame =
                requestAnimationFrame(
                    draw
                );
        };

        resize();

        window.addEventListener(
            "resize",
            resize
        );

        window.addEventListener(
            "mousemove",
            handleMouseMove
        );

        window.addEventListener(
            "mouseleave",
            handleMouseLeave
        );

        draw();

        return () => {
            cancelAnimationFrame(
                animationFrame
            );

            window.removeEventListener(
                "resize",
                resize
            );

            window.removeEventListener(
                "mousemove",
                handleMouseMove
            );

            window.removeEventListener(
                "mouseleave",
                handleMouseLeave
            );
        };

    }, [darkMode]);

    return (
        <canvas
            ref={canvasRef}
            className="pointer-events-none fixed inset-0 z-0 h-full w-full"
            aria-hidden="true"
        />
    );
};

export default MeshBackground;