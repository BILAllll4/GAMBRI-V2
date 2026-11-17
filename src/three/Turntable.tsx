/**
 * Hover turntable shared by the portal showroom, the collection and the cart.
 * Default: still, in its presentation pose. While hover.current is true the
 * piece spins continuously around its vertical axis (the speed eases in); when
 * it turns false the spin eases out and the piece settles back to its pose by
 * the shortest way round. Each turntable reads only its own hover ref, so
 * pieces never affect one another.
 */
import { useRef, type ReactNode, type RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { prefersReducedMotion } from '../lib/device'

const TAU = Math.PI * 2
/** angular speed while hovered (rad/s): about one turn every three seconds */
const SPIN = 0.32 * TAU

export function Turntable({
  hover,
  pose = -0.5,
  lift = 0.04,
  children,
}: {
  hover: RefObject<boolean>
  pose?: number
  /** how far the piece rises while hovered (scene units) */
  lift?: number
  children: ReactNode
}) {
  const turn = useRef<THREE.Group>(null)
  const raise = useRef(0)
  const angle = useRef(0) // extra rotation on top of the pose
  const speed = useRef(0) // current angular velocity (rad/s)
  const reduced = prefersReducedMotion()
  useFrame((_, delta) => {
    const g = turn.current
    if (!g) return
    const dt = Math.min(delta, 1 / 20) // no jump after a tab switch
    const on = !!hover.current
    raise.current += ((on ? 1 : 0) - raise.current) * (1 - Math.exp(-dt * 5))
    if (on) {
      speed.current += ((reduced ? SPIN * 0.4 : SPIN) - speed.current) * (1 - Math.exp(-dt * 3))
      angle.current += speed.current * dt
    } else {
      // return to the pose: critically damped toward the nearest whole turn
      const home = Math.round(angle.current / TAU) * TAU
      const k = 6
      speed.current += (-k * k * (angle.current - home) - 2 * k * speed.current) * dt
      angle.current += speed.current * dt
      if (Math.abs(angle.current - home) < 1e-4 && Math.abs(speed.current) < 1e-3) {
        angle.current = 0
        speed.current = 0
      }
    }
    g.rotation.y = pose + angle.current
    g.position.y = raise.current * lift
    g.scale.setScalar(1 + raise.current * 0.04)
  })
  return <group ref={turn}>{children}</group>
}
