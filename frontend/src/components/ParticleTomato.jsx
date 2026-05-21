import { Suspense, useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { useGLTF, OrbitControls, Environment } from '@react-three/drei'
import * as THREE from 'three'
import { MeshSurfaceSampler } from 'three/examples/jsm/math/MeshSurfaceSampler.js'

const CELL = 0.02
const SPHERE_RADIUS = 0.007
const TOTAL_SAMPLES = 80000
const MAX_INSTANCES = 35000

const PART_COLORS = {
  leaf:      new THREE.Color('#34ff8e'),
  smallLeaf: new THREE.Color('#9ef0b6'),
  stem:      new THREE.Color('#2f6b3a'),
  fruit:     new THREE.Color('#ff5b54'),
  unknown:   new THREE.Color('#34ff8e'),
}

function partKeyFor(name) {
  if (name === 'Object_2') return 'leaf'
  if (name === 'Object_3') return 'stem'
  if (name === 'Object_4') return 'fruit'
  if (name === 'Object_5') return 'smallLeaf'
  return 'unknown'
}

function sampleVoxels(scene) {
  scene.updateMatrixWorld(true)

  const meshes = []
  scene.traverse((obj) => {
    if (!obj.isMesh || !obj.geometry) return
    obj.geometry.computeBoundingBox()
    const size = new THREE.Vector3()
    obj.geometry.boundingBox.getSize(size)
    const area = 2 * (size.x * size.y + size.y * size.z + size.x * size.z)
    meshes.push({ mesh: obj, area, partKey: partKeyFor(obj.name) })
  })

  const totalArea = meshes.reduce((s, m) => s + m.area, 0) || 1

  const buckets = new Map()
  const tmpVec = new THREE.Vector3()

  meshes.forEach(({ mesh, area, partKey }) => {
    const sampler = new MeshSurfaceSampler(mesh).build()
    const sampleCount = Math.max(150, Math.round((TOTAL_SAMPLES * area) / totalArea))
    for (let i = 0; i < sampleCount; i++) {
      sampler.sample(tmpVec)
      tmpVec.applyMatrix4(mesh.matrixWorld)
      const kx = Math.floor(tmpVec.x / CELL)
      const ky = Math.floor(tmpVec.y / CELL)
      const kz = Math.floor(tmpVec.z / CELL)
      const key = `${kx}|${ky}|${kz}`
      if (!buckets.has(key)) {
        buckets.set(key, {
          pos: new THREE.Vector3(
            (kx + 0.5) * CELL,
            (ky + 0.5) * CELL,
            (kz + 0.5) * CELL,
          ),
          partKey,
        })
      }
    }
  })

  const voxels = Array.from(buckets.values())
  if (voxels.length > MAX_INSTANCES) voxels.length = MAX_INSTANCES
  return voxels
}

function ParticleField() {
  const { scene } = useGLTF('/models/tomato.glb')
  const meshRef = useRef()
  const groupRef = useRef()

  const voxels = useMemo(() => sampleVoxels(scene), [scene])

  useEffect(() => {
    const mesh = meshRef.current
    if (!mesh || !voxels.length) return
    const matrix = new THREE.Matrix4()
    const pos = new THREE.Vector3()
    const quat = new THREE.Quaternion()
    const scale = new THREE.Vector3(1, 1, 1)
    voxels.forEach((v, i) => {
      pos.copy(v.pos)
      matrix.compose(pos, quat, scale)
      mesh.setMatrixAt(i, matrix)
      mesh.setColorAt(i, PART_COLORS[v.partKey] || PART_COLORS.unknown)
    })
    mesh.count = voxels.length
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  }, [voxels])

  useFrame((_, dt) => {
    if (groupRef.current) groupRef.current.rotation.y += dt * 0.18
  })

  return (
    <group ref={groupRef} position={[0, -1.2, 0]} scale={2.4}>
      <instancedMesh
        ref={meshRef}
        args={[undefined, undefined, MAX_INSTANCES]}
      >
        <sphereGeometry args={[SPHERE_RADIUS, 8, 8]} />
        <meshStandardMaterial
          metalness={0.15}
          roughness={0.4}
          emissive="#0a2818"
          emissiveIntensity={0.5}
        />
      </instancedMesh>
    </group>
  )
}

export default function ParticleTomato() {
  return (
    <div className="relative h-full w-full">
      <Canvas
        camera={{ position: [0, 2, 6], fov: 40 }}
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          outputColorSpace: THREE.SRGBColorSpace,
        }}
      >
        <ambientLight intensity={0.5} color="#dbeafe" />
        <directionalLight position={[4, 6, 4]} intensity={1.2} color="#ffffff" />
        <pointLight position={[-3, 2, -2]} intensity={1.1} color="#34ff8e" />
        <pointLight position={[3, -1, 2]} intensity={0.5} color="#a7f3d0" />

        <Suspense fallback={null}>
          <ParticleField />
          <gridHelper args={[28, 56, '#1f5a3c', '#0f3322']} position={[0, -1.205, 0]} />
          <Environment preset="studio" />
        </Suspense>

        <OrbitControls
          enableZoom={false}
          enablePan={false}
          autoRotate
          autoRotateSpeed={0.55}
          minPolarAngle={Math.PI / 3}
          maxPolarAngle={Math.PI / 1.8}
        />
      </Canvas>
    </div>
  )
}

useGLTF.preload('/models/tomato.glb')
