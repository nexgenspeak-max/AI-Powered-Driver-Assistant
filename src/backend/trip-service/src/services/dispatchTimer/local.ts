// Dev-only — `local.ts` is a persistent process, so an in-process setTimeout
// safely survives long enough to fire. NOT safe in Lambda (see lambda.ts).
export async function scheduleOfferTimeout(tripId: string, candidatePhone: string, seconds: number): Promise<void> {
  setTimeout(() => {
    // Dynamic import breaks the circular dependency — dispatchOrchestrator
    // calls scheduleOfferTimeout, and the timeout needs to call back into
    // dispatchOrchestrator once it fires.
    import('../dispatchOrchestrator')
      .then(({ handleOfferTimeout }) => handleOfferTimeout(tripId, candidatePhone))
      .catch((err) => console.warn(`[dispatchTimer] handleOfferTimeout failed trip=${tripId}:`, err));
  }, seconds * 1000);
}
