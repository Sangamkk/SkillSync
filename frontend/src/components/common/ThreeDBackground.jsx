import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float } from "@react-three/drei";


/* =====================================================
   PARTICLES
===================================================== */

function Particles({ darkMode }) {

    const pointsRef = useRef(null);

    const count = 450;


    const positions = useMemo(() => {

        const data = new Float32Array(
            count * 3
        );

        for (let i = 0; i < count; i++) {

            data[i * 3] =
                (Math.random() - 0.5) * 16;

            data[i * 3 + 1] =
                (Math.random() - 0.5) * 10;

            data[i * 3 + 2] =
                (Math.random() - 0.5) * 8 - 2;

        }

        return data;

    }, []);


    useFrame((state) => {

        if (!pointsRef.current) return;

        /*
        Slow floating movement
        */

        pointsRef.current.rotation.y += 0.00035;

        pointsRef.current.rotation.x += 0.0001;


        /*
        Mouse creates subtle space movement
        */

        pointsRef.current.position.x +=
            (
                state.pointer.x * 0.35 -
                pointsRef.current.position.x
            ) * 0.008;


        pointsRef.current.position.y +=
            (
                state.pointer.y * 0.20 -
                pointsRef.current.position.y
            ) * 0.008;

    });


    return (

        <points ref={pointsRef}>

            <bufferGeometry>

                <bufferAttribute
                    attach="attributes-position"
                    count={count}
                    array={positions}
                    itemSize={3}
                />

            </bufferGeometry>


            <pointsMaterial
                size={
                    darkMode
                        ? 0.028
                        : 0.021
                }

                color={
                    darkMode
                        ? "#8BD8FF"
                        : "#46639E"
                }

                transparent

                opacity={
                    darkMode
                        ? 0.48
                        : 0.28
                }

                sizeAttenuation

                depthWrite={false}

            />

        </points>

    );

}


/* =====================================================
   FLOATING ORB
===================================================== */

function Orb({
    position,
    color,
    size = 0.12,
    darkMode
}) {

    const ref = useRef(null);


    useFrame((state) => {

        if (!ref.current) return;


        /*
        Floating movement
        */

        ref.current.position.y =
            position[1] +
            Math.sin(
                state.clock.elapsedTime *
                0.65 +
                position[0]
            ) * 0.13;


        ref.current.position.x =
            position[0] +
            Math.cos(
                state.clock.elapsedTime *
                0.45 +
                position[1]
            ) * 0.04;

    });


    return (

        <Float
            speed={0.8}
            rotationIntensity={0.15}
            floatIntensity={0.3}
        >

            <mesh
                ref={ref}
                position={position}
            >

                <sphereGeometry
                    args={[
                        size,
                        32,
                        32
                    ]}
                />


                <meshStandardMaterial

                    color={color}

                    emissive={color}

                    emissiveIntensity={
                        darkMode
                            ? 1.8
                            : 0.7
                    }

                    roughness={0.2}

                    metalness={0.5}

                />

            </mesh>

        </Float>

    );

}


/* =====================================================
   FLOATING LIGHT CLOUDS
===================================================== */

function LightCloud({
    position,
    color,
    scale,
    darkMode
}) {

    const ref = useRef(null);


    useFrame((state) => {

        if (!ref.current) return;


        ref.current.position.x =
            position[0] +
            Math.sin(
                state.clock.elapsedTime * 0.15 +
                position[1]
            ) * 0.25;


        ref.current.position.y =
            position[1] +
            Math.cos(
                state.clock.elapsedTime * 0.18 +
                position[0]
            ) * 0.20;

    });


    return (

        <mesh
            ref={ref}
            position={position}
            scale={scale}
        >

            <sphereGeometry
                args={[
                    1,
                    32,
                    32
                ]}
            />


            <meshBasicMaterial

                color={color}

                transparent

                opacity={
                    darkMode
                        ? 0.045
                        : 0.035
                }

                depthWrite={false}

                blending={
                    2
                }

            />

        </mesh>

    );

}


/* =====================================================
   LIGHTING
===================================================== */

function Lighting({ darkMode }) {

    return (

        <>

            <ambientLight
                intensity={
                    darkMode
                        ? 0.3
                        : 0.65
                }
            />


            <pointLight
                position={[
                    -4,
                    3,
                    3
                ]}

                color="#3B82F6"

                intensity={
                    darkMode
                        ? 4
                        : 1.3
                }

                distance={12}

            />


            <pointLight
                position={[
                    4,
                    -2,
                    2
                ]}

                color="#8B5CF6"

                intensity={
                    darkMode
                        ? 3
                        : 1
                }

                distance={12}

            />

        </>

    );

}


/* =====================================================
   SCENE
===================================================== */

function Scene({ darkMode }) {

    return (

        <>

            <Lighting
                darkMode={darkMode}
            />


            {/* =====================================
                PARTICLE FIELD
            ===================================== */}

            <Particles
                darkMode={darkMode}
            />


            {/* =====================================
                SOFT SPACE CLOUDS
            ===================================== */}

            <LightCloud
                position={[
                    -4,
                    2,
                    -4
                ]}
                scale={[
                    3,
                    2,
                    2
                ]}
                color="#2563EB"
                darkMode={darkMode}
            />


            <LightCloud
                position={[
                    4,
                    -1,
                    -4
                ]}
                scale={[
                    3,
                    2.5,
                    2
                ]}
                color="#7C3AED"
                darkMode={darkMode}
            />


            <LightCloud
                position={[
                    0,
                    3,
                    -5
                ]}
                scale={[
                    2.5,
                    1.5,
                    2
                ]}
                color="#06B6D4"
                darkMode={darkMode}
            />


            {/* =====================================
                FLOATING NODES
            ===================================== */}

            <Orb
                position={[
                    -4.2,
                    1.8,
                    -2
                ]}
                color="#3B82F6"
                size={0.12}
                darkMode={darkMode}
            />


            <Orb
                position={[
                    -1.5,
                    2.5,
                    -2.5
                ]}
                color="#8B5CF6"
                size={0.09}
                darkMode={darkMode}
            />


            <Orb
                position={[
                    1.2,
                    1.7,
                    -2
                ]}
                color="#38BDF8"
                size={0.13}
                darkMode={darkMode}
            />


            <Orb
                position={[
                    3.8,
                    2.4,
                    -2.5
                ]}
                color="#6366F1"
                size={0.10}
                darkMode={darkMode}
            />


            <Orb
                position={[
                    -3.8,
                    -1.8,
                    -2
                ]}
                color="#6366F1"
                size={0.08}
                darkMode={darkMode}
            />


            <Orb
                position={[
                    1.5,
                    -1.6,
                    -2
                ]}
                color="#8B5CF6"
                size={0.10}
                darkMode={darkMode}
            />


            <Orb
                position={[
                    4,
                    -0.8,
                    -2.5
                ]}
                color="#38BDF8"
                size={0.08}
                darkMode={darkMode}
            />

        </>

    );

}


/* =====================================================
   MAIN COMPONENT
===================================================== */

const ThreeDBackground = ({
    darkMode = true
}) => {

    return (

        <div
            className="
                pointer-events-none
                fixed
                inset-0
                z-0
            "
        >

            <Canvas

                camera={{
                    position: [
                        0,
                        0,
                        8
                    ],

                    fov: 55
                }}

                dpr={[
                    1,
                    1.5
                ]}

            >

                <Scene
                    darkMode={darkMode}
                />

            </Canvas>

        </div>

    );

};


export default ThreeDBackground;