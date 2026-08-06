import { useEffect, useState } from "react";

import {
  acceptOffer as acceptOfferOnChain,
  rejectOffer as rejectOfferOnChain,
} from "../../services/blockchainService";

import {
  getMyOffers,
  acceptOffer as acceptOfferBackend,
  rejectOffer as rejectOfferBackend,
} from "../../services/employmentService";

function StudentOffers() {
  const [offers, setOffers] = useState([]);

  useEffect(() => {
    fetchOffers();
  }, []);

  async function fetchOffers() {
    try {
      const data = await getMyOffers();
      setOffers(data);
    } catch (err) {
      console.error(err);
    }
  }

  async function handleAccept(offer) {
    try {

      // Blockchain

      await acceptOfferOnChain(offer.offerId);

      // MongoDB / Backend
      await acceptOfferBackend(offer.offerId);

      alert("Offer Accepted");

      fetchOffers();
    } catch (err) {
      console.error(err);
    }
  }

  async function handleReject(offerId) {
    try {
      // Blockchain
      await rejectOfferOnChain(offerId);

      // MongoDB / Backend
      await rejectOfferBackend(offerId);

      alert("Offer Rejected");

      fetchOffers();
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <div>
      <h1>My Offers</h1>

      {offers.length === 0 ? (
        <p>No Offers Found</p>
      ) : (
        offers.map((offer) => (
          <div
            key={offer._id}
            style={{
              border: "1px solid #ccc",
              padding: "15px",
              marginBottom: "15px",
            }}
          >
            <h2>{offer.job?.title}</h2>

            <p>{offer.job?.description}</p>

            <p>Status: {offer.status}</p>

            {offer.status === "Offered" && (
              <>
                <button
                  onClick={() =>
                  {     
  
                    handleAccept(offer)}
                  }
                >
                  Accept
                </button>

                <button
                  onClick={() =>
                    handleReject(offer.offerId)
                  }
                >
                  Reject
                </button>
              </>
            )}
          </div>
        ))
      )}
    </div>
  );
}

export default StudentOffers;