/**
 * Guembri materials and finishes.
 *
 * The geometry is a Blender model (public/models/guembri.glb, built by
 * scripts/blender/build-guembri.py, rendered by ./GuembriGLB.tsx). Its materials
 * are replaced by these textured ones, generated in code, so the store finishes
 * (natural / dark / aged) only tint them.
 */
import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { cordTextures, skinTextures, woodTextures, type PBRSet } from './textures'

/* ---------------- shared textures (generated once) ----------------------- */
let TEX: { wood: PBRSet; neckWood: PBRSet; skin: PBRSet; cord: PBRSet } | null = null
export function getTextures() {
  if (!TEX) {
    const small = Math.min(window.innerWidth, window.innerHeight) < 700
    const s = small ? 512 : 1024
    TEX = {
      wood: woodTextures(s, 7, [0.3, 0.17, 0.085]),
      neckWood: woodTextures(small ? 256 : 512, 21, [0.36, 0.22, 0.12]),
      skin: skinTextures(s, 3),
      cord: cordTextures(),
    }
  }
  return TEX
}

export type GuembriFinish = 'natural' | 'dark' | 'aged' | 'play' | 'traditional' | 'handmade' | 'premium'
const FINISHES: Record<GuembriFinish, { wood: string; neck: string; skin: string }> = {
  natural: { wood: '#ffffff', neck: '#ffffff', skin: '#ffffff' },
  /** Page 3: warm honey skin and a light neck, as in the flat-lay reference */
  play: { wood: '#e6c79c', neck: '#f4d6a8', skin: '#e9b878' },
  /** ebony-dark wood under a pale ivory skin */
  dark: { wood: '#231813', neck: '#3a2a20', skin: '#fffaf0' },
  aged: { wood: '#7d6048', neck: '#6e5340', skin: '#b38c5e' },
  /** catalogue finishes, kept clearly apart: honey-gold oiled wood; pale raw wood; deep red walnut */
  traditional: { wood: '#d0904a', neck: '#dba05e', skin: '#e2a24e' },
  handmade: { wood: '#e9d3b2', neck: '#dcc29c', skin: '#fff8ea' },
  premium: { wood: '#8c2a1a', neck: '#7c2416', skin: '#c47f45' },
}

/** textured materials for the guembri GLB, tinted per finish */
export function useGuembriMaterials(finish: GuembriFinish = 'natural') {
  const tex = getTextures()
  const mats = useMemo(() => {
    const wood = new THREE.MeshPhysicalMaterial({
      ...tex.wood,
      bumpScale: 1.6,
      roughness: 0.62,
      clearcoat: 0.25,
      clearcoatRoughness: 0.55,
      sheen: 0.2,
      sheenColor: new THREE.Color('#6b4a2a'),
    })
    wood.map!.repeat.set(1.6, 1.6)
    wood.roughnessMap!.repeat.set(1.6, 1.6)
    wood.bumpMap!.repeat.set(1.6, 1.6)

    const neck = new THREE.MeshPhysicalMaterial({
      ...tex.neckWood,
      bumpScale: 1.2,
      roughness: 0.5,
      clearcoat: 0.35,
      clearcoatRoughness: 0.4,
    })

    const skin = new THREE.MeshPhysicalMaterial({
      ...tex.skin,
      bumpScale: 0.9,
      roughness: 0.7,
      sheen: 0.45,
      sheenRoughness: 0.6,
      sheenColor: new THREE.Color('#e9d2a6'),
      side: THREE.FrontSide,
    })
    skin.map!.repeat.set(1.5, 1.5)
    skin.roughnessMap!.repeat.set(1.5, 1.5)
    skin.bumpMap!.repeat.set(1.5, 1.5)

    const cordMap = tex.cord.map.clone()
    cordMap.repeat.set(1, 4)
    cordMap.needsUpdate = true
    const cord = new THREE.MeshStandardMaterial({ map: cordMap, bumpMap: tex.cord.bumpMap, bumpScale: 3, roughness: 0.78 })
    const lace = new THREE.MeshStandardMaterial({ color: '#3a2414', roughness: 0.7, bumpMap: tex.cord.bumpMap, bumpScale: 2 })
    const metal = new THREE.MeshStandardMaterial({ color: '#a39684', metalness: 0.92, roughness: 0.42, envMapIntensity: 1.2 })
    const darkMetal = new THREE.MeshStandardMaterial({ color: '#5f564a', metalness: 0.85, roughness: 0.5 })
    const gut = new THREE.MeshPhysicalMaterial({ color: '#cdb48a', roughness: 0.4, sheen: 0.6, sheenColor: new THREE.Color('#fff1d0') })
    return { wood, neck, skin, cord, lace, metal, darkMetal, gut }
  }, [tex])

  // finishes tint the shared textures: stained (dark) wood, or an aged
  // instrument with smoked wood and a darker, played-in skin
  useEffect(() => {
    const t = FINISHES[finish]
    mats.wood.color.set(t.wood)
    mats.neck.color.set(t.neck)
    mats.skin.color.set(t.skin)
  }, [finish, mats])
  return mats
}
