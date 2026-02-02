interface TagListProps {
  tags: Array<{ tag: { name: string } }>
}

export function TagList({ tags }: TagListProps) {
  if (tags.length === 0) {
    return <span className="text-white/40 text-sm">None</span>
  }

  return (
    <ul className="flex flex-wrap gap-2 list-none p-0 m-0">
      {tags.map((item, i) => (
        <li
          key={i}
          className="inline-flex items-center bg-neutral-700 text-neutral-200 text-sm rounded py-1 px-2"
        >
          {item.tag.name}
        </li>
      ))}
    </ul>
  )
}
