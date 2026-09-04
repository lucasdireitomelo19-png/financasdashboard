import { motion, useReducedMotion } from 'framer-motion'
import type { ReactNode } from 'react'

const MOTION_TAG = { div: motion.div, li: motion.li } as const

/** Entrada escalonada (fade + leve subida em 3D) pra listas e grids de cards. */
export function Reveal({
  children,
  index = 0,
  className = '',
  as = 'div',
}: {
  children: ReactNode
  index?: number
  className?: string
  as?: keyof typeof MOTION_TAG
}) {
  const reduceMotion = useReducedMotion()
  const Tag = as === 'li' ? 'li' : 'div'

  if (reduceMotion) {
    const Plain = Tag
    return <Plain className={className}>{children}</Plain>
  }

  const MotionTag = MOTION_TAG[as]

  return (
    <MotionTag
      className={className}
      initial={{ opacity: 0, y: 16, rotateX: -6 }}
      animate={{ opacity: 1, y: 0, rotateX: 0 }}
      transition={{ duration: 0.45, delay: Math.min(index, 10) * 0.05, ease: [0.16, 1, 0.3, 1] }}
      style={{ transformPerspective: 600 }}
    >
      {children}
    </MotionTag>
  )
}
