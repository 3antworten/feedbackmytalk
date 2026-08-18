import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "./api";
import { getParticipant } from "./participant";

// Resolves a join code to its session + the caller's participant identity (redirecting to
// the join screen if they haven't joined yet). Shared by every participant-facing page so
// each one doesn't re-implement the same lookup/redirect dance.
export function useParticipantSession(joinCode) {
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [deck, setDeck] = useState(null);
  const [participant, setParticipant] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    api
      .lookupJoinCode(joinCode)
      .then((info) => {
        if (cancelled) return;
        const p = getParticipant(info.session.id);
        if (!p) {
          navigate(`/j/${joinCode}`, { replace: true });
          return;
        }
        setSession(info.session);
        setDeck(info.deck);
        setParticipant(p);
      })
      .catch((e) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [joinCode]);

  return { session, deck, participant, error, ready: !!session && !!participant };
}
