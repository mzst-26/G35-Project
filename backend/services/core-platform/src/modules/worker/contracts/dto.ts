import type { Worker } from "../domain/types.js";

export function workerToJson(worker: Worker) {
  return {
    id: worker.id,
    userId: worker.userId,
    tradeId: worker.tradeId,
    qualifications: worker.qualifications,
    verifiedStatus: worker.verifiedStatus,
    addressLine1: worker.addressLine1,
    addressLine2: worker.addressLine2,
    city: worker.city,
    locationLng: worker.locationLng,
    locationLat: worker.locationLat,
    bio: worker.bio,
    avatarUrl: worker.avatarUrl,
    hourlyRate: worker.hourlyRate,
  };
}
