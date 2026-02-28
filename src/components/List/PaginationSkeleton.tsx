import { Skeleton } from '../Loaders'

export const PaginationSkeleton = () => {
  return (
    <div className="flex flex-row gap-1 justify-center w-full">
      <Skeleton width={85} height={34} />
      <Skeleton width={32} height={34} />
      <Skeleton width={36} height={34} />
      <Skeleton width={85} height={34} />
    </div>
  )
}
