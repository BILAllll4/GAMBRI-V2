/**
 * The Blender-built guembri (public/models/guembri.glb, made by
 * scripts/blender/build-guembri.py). Built to the dimensions in GEO (src/data/notes.ts),
 * so the strings drawn here line up with its bridge, bindings and spike.
 *
 * With `interactive`, the strings take hits and the note markers show (Page 3).
 * The GLB carries geometry and UVs only; its materials are swapped by name for
 * the site's textured ones, so finishes (natural / dark / aged) still apply.
 *
 * The GLB's nine nodes are gathered into the instrument's four components —
 * wood (Body), leather (Skin, Tacks, Lacing), strings (the three strings drawn
 * here + Bridge) and neck (Neck, Bindings, Sersera, SerseraRings) — each in a
 * group that pivots about its own centre. With `explodable`, those groups
 * follow the live transforms in sections/guembri/journey (`parts`); otherwise
 * they stay at rest and the instrument is exactly the assembled model.
 * `attach` places extra meshes inside a component (the engraving on the skin,
 * the carving on the neck) so they travel with it.
 */
import { useEffect, useMemo, type ReactNode } from 'react'
import { createPortal, useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { STRINGS } from '../data/notes'
import { GuembriString } from './GuembriString'
import { NoteMarkers } from './NoteMarkers'
import { useGuembriMaterials, type GuembriFinish } from './Guembri'
import { parts } from '../sections/guembri/journey'
import type { ComponentId } from '../data/anatomy'

import { GUEMBRI_GLB } from '../preload/assets'
export { GUEMBRI_GLB }

type Mats = ReturnType<typeof useGuembriMaterials>
const BY_NAME: Record<string, keyof Mats> = {
  Wood: 'wood',
  NeckWood: 'neck',
  Skin: 'skin',
  Cord: 'cord',
  Lace: 'lace',
  Metal: 'metal',
  DarkMetal: 'darkMetal',
}

/** which component each GLB node belongs to, and where each component pivots */
const NODE_GROUP: Record<string, ComponentId> = {
  Body: 'wood',
  Skin: 'leather',
  Tacks: 'leather',
  Lacing: 'leather',
  Bridge: 'strings',
  Neck: 'neck',
  Bindings: 'neck',
  Sersera: 'neck',
  SerseraRings: 'neck',
}
const PIVOT: Record<ComponentId, [number, number, number]> = {
  wood: [-0.35, -0.08, 0],
  leather: [-0.35, 0.0, 0],
  strings: [-0.05, 0.03, 0],
  neck: [0.0, 0.01, 0],
}
const IDS: ComponentId[] = ['wood', 'leather', 'strings', 'neck']

export function GuembriGLB({
  finish = 'natural',
  interactive = false,
  stringColor,
  highlight,
  explodable = false,
  attach,
}: {
  finish?: GuembriFinish
  interactive?: boolean
  /** override the gut colour (Page 3 uses dark strings that read on a light skin) */
  stringColor?: string
  /** GLB node names to light up */
  highlight?: string[]
  /** follow the live component transforms of the guembri journey */
  explodable?: boolean
  /** extra meshes carried by a component */
  attach?: Partial<Record<ComponentId, ReactNode>>
}) {
  const { scene } = useGLTF(GUEMBRI_GLB)
  const mats = useGuembriMaterials(finish)
  // applied during render: GuembriString clones the gut material when it mounts
  useMemo(() => {
    if (!stringColor) return
    mats.gut.color.set(stringColor)
    mats.gut.sheen = 0.12
  }, [stringColor, mats])

  // each instance needs its own copy of the graph (one material set per finish),
  // regrouped into the four components
  const { model, groups } = useMemo(() => {
    const root = scene.clone(true)
    root.traverse((o) => {
      const mesh = o as THREE.Mesh
      if (!mesh.isMesh) return
      const name = (mesh.material as THREE.Material).name.replace(/\.\d+$/, '')
      const key = BY_NAME[name]
      if (key) mesh.material = mats[key]
      mesh.castShadow = true
      mesh.receiveShadow = true
    })
    const groups = {} as Record<ComponentId, { outer: THREE.Group; inner: THREE.Group }>
    for (const id of IDS) {
      const outer = new THREE.Group()
      const inner = new THREE.Group()
      outer.name = `component:${id}`
      outer.position.set(...PIVOT[id])
      inner.position.set(-PIVOT[id][0], -PIVOT[id][1], -PIVOT[id][2])
      outer.add(inner)
      groups[id] = { outer, inner }
    }
    for (const node of [...root.children]) {
      const id = NODE_GROUP[node.name]
      if (id) groups[id].inner.add(node)
    }
    for (const id of IDS) if (id !== 'strings') root.add(groups[id].outer)
    return { model: root, groups }
  }, [scene, mats])

  // highlighted parts get a warm emissive copy of their material; everything else keeps its own
  const key = highlight?.join('|') ?? ''
  useEffect(() => {
    if (!key) return
    const names = new Set(key.split('|'))
    const swapped: [THREE.Mesh, THREE.Material][] = []
    for (const obj of [model, groups.strings.outer]) {
      obj.traverse((o) => {
        const mesh = o as THREE.Mesh
        if (!mesh.isMesh || !names.has(mesh.name)) return
        const orig = mesh.material as THREE.MeshStandardMaterial
        const lit = orig.clone()
        lit.emissive = new THREE.Color('#c8913f')
        lit.emissiveIntensity = 0.42
        mesh.material = lit
        swapped.push([mesh, orig])
      })
    }
    return () => {
      for (const [mesh, orig] of swapped) {
        ;(mesh.material as THREE.Material).dispose()
        mesh.material = orig
      }
    }
  }, [key, model, groups])

  useFrame(() => {
    if (!explodable) return
    for (const id of IDS) {
      const g = groups[id].outer
      const t = parts[id]
      g.position.set(PIVOT[id][0] + t.pos.x, PIVOT[id][1] + t.pos.y, PIVOT[id][2] + t.pos.z)
      g.rotation.copy(t.rot)
      g.scale.setScalar(1 + t.focus * 0.035)
    }
  })

  return (
    <group name="Guembri">
      <primitive object={model} />
      <primitive object={groups.strings.outer} />
      {createPortal(
        <>
          {STRINGS.map((s) => (
            <GuembriString key={s.id} string={s} material={mats.gut} interactive={interactive} />
          ))}
          {interactive && <NoteMarkers />}
          {attach?.strings}
        </>,
        groups.strings.inner,
      )}
      {attach?.leather && createPortal(attach.leather, groups.leather.inner)}
      {attach?.neck && createPortal(attach.neck, groups.neck.inner)}
      {attach?.wood && createPortal(attach.wood, groups.wood.inner)}
    </group>
  )
}

useGLTF.preload(GUEMBRI_GLB)
