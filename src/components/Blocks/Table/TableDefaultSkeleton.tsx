import { Skeleton } from '~/components/Loaders'

type Props = {
  size: number
}

export const TableDefaultSkeleton = ({ size }: Props) => {
  return (
    <div className="w-full h-full flex flex-col gap-4">
      <div className="flex flex-row gap-4 items-center">
        {Array.from({ length: size }).map((_, index) => (
          <Skeleton key={index} width="100%" height={24} />
        ))}
      </div>
      <div className="flex flex-col gap-4">
        <Skeleton width="100%" height={40} />
        <Skeleton width="100%" height={40} />
        <Skeleton width="100%" height={40} />
      </div>
    </div>
  )
}
