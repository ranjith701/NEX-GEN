import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, doc, setDoc, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// 1. Paste your exact configuration snippet from the Firebase Console here:
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ================= ACTION: GENERATE A NEW REPAIR JOB =================
document.getElementById('intakeForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Generate a clean random 5-digit job card identifier
    const randomId = Math.floor(10000 + Math.random() * 90000);
    const jobCardId = `JOB-${randomId}`;

    const newJob = {
        job_card_id: jobCardId,
        customer_phone: document.getElementById('custPhone').value.trim(),
        device_model: document.getElementById('deviceModel').value.trim(),
        issue_description: document.getElementById('issueDesc').value.trim(),
        status: "Pending", // Default lifecycle step
        assigned_tech_id: "",
        tech_notes: "",
        created_at: new Date().toISOString()
    };

    try {
        // Save directly to the firestore collection mapping it by the unique Job ID
        await setDoc(doc(db, "repair_jobs", jobCardId), newJob);
        alert(`Success! Generated Job Card ID: ${jobCardId}`);
        document.getElementById('intakeForm').reset();
    } catch (error) {
        console.error("Error creating job: ", error);
        alert("Failed to submit ticket. Check database connection.");
    }
});

// ================= ACTION: CUSTOMER STATUS TRACKING =================
window.trackJob = async function() {
    const userInput = document.getElementById('trackInput').value.trim();
    const resultDiv = document.getElementById('statusResult');
    
    if (!userInput) return;

    resultDiv.classList.remove('hidden', 'bg-red-100', 'text-red-800', 'bg-yellow-100', 'text-yellow-800', 'bg-green-100', 'text-green-800');
    resultDiv.innerHTML = "Searching database...";
    resultDiv.classList.add('block', 'bg-gray-100');

    try {
        let jobData = null;

        if (userInput.toUpperCase().startsWith('JOB-')) {
            // Path A: Searching directly via explicit unique Job Card ID document key
            const docRef = doc(db, "repair_jobs", userInput.toUpperCase());
            const docSnap = await getDocs(query(collection(db, "repair_jobs"), where("job_card_id", "==", userInput.toUpperCase())));
            if(!docSnap.empty) jobData = docSnap.docs[0].data();
        } else {
            // Path B: Searching via Customer Mobile Number query fallback
            const q = query(collection(db, "repair_jobs"), where("customer_phone", "==", userInput));
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
                // Return the most recent ticket found under this mobile number
                jobData = querySnapshot.docs[0].data(); 
            }
        }

        if (jobData) {
            // Styling logic based on current status string variables
            let statusColor = 'bg-yellow-100 text-yellow-800'; // Under Process
            if (jobData.status === 'Pending') statusColor = 'bg-blue-100 text-blue-800';
            if (jobData.status === 'Ready') statusColor = 'bg-green-100 text-green-800';
            if (jobData.status === 'Returned') statusColor = 'bg-red-100 text-red-800';

            resultDiv.className = `mt-4 p-4 rounded-lg text-center font-medium ${statusColor}`;
            resultDiv.innerHTML = `
                <div class="text-sm font-normal">Model: ${jobData.device_model}</div>
                <div class="text-lg font-bold mt-1">Status: ${jobData.status}</div>
                ${jobData.tech_notes ? `<div class="text-xs text-gray-600 mt-2 border-t pt-1">Notes: ${jobData.tech_notes}</div>` : ''}
            `;
        } else {
            resultDiv.className = "mt-4 p-4 rounded-lg text-center font-medium bg-red-100 text-red-800";
            resultDiv.innerHTML = "No active repair records found for that input.";
        }
    } catch (error) {
        console.error("Search error: ", error);
        resultDiv.innerHTML = "An error occurred while communicating with database.";
    }
}
