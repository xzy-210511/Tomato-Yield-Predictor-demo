export default function GlassPanel({
  children,
  header,
  footer,
  className = '',
  padding = 'p-5',
  bordered = true,
  onMouseDown,
  ...rest
}) {
  const borderCls = bordered ? 'border border-ink-700' : ''
  return (
    <div
      {...rest}
      onMouseDown={(e) => {
        e.stopPropagation()
        onMouseDown?.(e)
      }}
      onTouchStart={(e) => e.stopPropagation()}
      className={`relative rounded-3xl ${borderCls} bg-ink-900/82 backdrop-blur-xl shadow-[0_24px_60px_-24px_rgba(0,0,0,0.7)] ${className}`}
    >
      {header ? (
        <div className="border-b border-ink-700/70 px-5 py-3.5">
          {header}
        </div>
      ) : null}
      <div className={padding}>{children}</div>
      {footer ? (
        <div className="border-t border-ink-700/70 px-5 py-3.5">
          {footer}
        </div>
      ) : null}
    </div>
  )
}
