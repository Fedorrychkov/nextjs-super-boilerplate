import { MediaPurpose, MediaVisibility } from '~/api/media/model'
import { UserRole } from '~/api/user/model'

type AssetAccessView = { visibility?: string | null; createdBy?: string | null }
type Viewer = { userId: string; role: string }

/**
 * Who may read an asset through the authorised file route. Public assets are open to any signed-in
 * caller (the public `/cdn` serves them anyway); a private one is the owner's or an admin's.
 * Missing `visibility` is a document from before the field existed — public, as it always was.
 */
export function canReadMediaAsset(asset: AssetAccessView, viewer: Viewer): boolean {
  if ((asset.visibility ?? MediaVisibility.PUBLIC) !== MediaVisibility.PRIVATE) return true

  if (viewer.role === UserRole.ADMIN) return true

  return Boolean(asset.createdBy) && asset.createdBy === viewer.userId
}

/** The CMS library (list, delete by editors) owns CMS files only; a person's file is not the editors' to remove. */
export function isLibraryAsset(asset: { purpose?: string | null }): boolean {
  return (asset.purpose ?? MediaPurpose.CMS) !== MediaPurpose.USER
}
