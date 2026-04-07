import React from 'react';
import { fetchCheckIn } from '../utils/api.js';

const CheckInModal = () => {
    const handleCheckIn = async () => {
        const response = await fetchCheckIn();
        // handle response
    };

    return (
        <div className="check-in-modal">
            <h2>Check In</h2>
            <button onClick={handleCheckIn}>Check In</button>
        </div>
    );
};

export default CheckInModal;