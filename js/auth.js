// Authentication Controller & Guards
let currentUser = null;
let currentMandal = null;
let currentFestival = null;

async function checkAuth(requireAuth = true) {
    const { data: { user }, error } = await db.auth.getUser();

    if (!user && requireAuth) {
        window.location.replace('index.html');
        return null;
    }

    if (user) {
        currentUser = user;
        await loadUserMandals();
    }
    return user;
}

async function signInWithGoogle() {
    const { error } = await db.auth.signInWithOAuth({
        provider: 'google',
        options: {
            redirectTo: `${window.location.origin}/dashboard.html`
        }
    });
    if (error) showToast(error.message, 'error');
}

async function signOut() {
    localStorage.removeItem('selected_mandal_id');
    localStorage.removeItem('selected_festival_id');
    await db.auth.signOut();
    window.location.replace('index.html');
}

async function loadUserMandals() {
    // Fetch active memberships
    const { data: memberships, error } = await db
        .from('mandal_members')
        .select(`
            role, status,
            mandals ( id, name, city, district, logo_url )
        `)
        .eq('user_id', currentUser.id)
        .eq('status', 'ACTIVE');

    if (error || !memberships || memberships.length === 0) {
        if (!window.location.pathname.includes('index.html') && !window.location.pathname.includes('settings.html')) {
            // Show Onboarding Modal
            showOnboardingModal();
        }
        return;
    }

    const savedMandalId = localStorage.getItem('selected_mandal_id');
    const matched = memberships.find(m => m.mandals.id === savedMandalId);
    
    currentMandal = matched ? matched.mandals : memberships[0].mandals;
    localStorage.setItem('selected_mandal_id', currentMandal.id);

    const mandalLabel = document.getElementById('nav-mandal-name');
    if (mandalLabel) mandalLabel.innerText = currentMandal.name;

    await loadActiveFestival();
}

async function loadActiveFestival() {
    if (!currentMandal) return;
    const { data: festivals } = await db
        .from('festivals')
        .select('*')
        .eq('mandal_id', currentMandal.id)
        .order('is_active', { ascending: false });

    if (festivals && festivals.length > 0) {
        currentFestival = festivals[0];
        localStorage.setItem('selected_festival_id', currentFestival.id);
    }
}

function showOnboardingModal() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay active';
    modal.innerHTML = `
        <div class="modal-card">
            <div class="modal-header">
                <h3>मंडळ सुरू करा / Setup Mandal</h3>
            </div>
            <form id="onboardingForm" class="modal-body">
                <div class="form-group">
                    <label class="form-label">Mandal Name (मंडळाचे नाव) *</label>
                    <input type="text" id="ob_name" class="form-control" placeholder="उदा. शिवशक्ती गणेश मंडळ" required />
                </div>
                <div class="form-group">
                    <label class="form-label">City (शहर/गाव) *</label>
                    <input type="text" id="ob_city" class="form-control" placeholder="उदा. पुणे" required />
                </div>
                <div class="form-group">
                    <label class="form-label">District (जिल्हा) *</label>
                    <input type="text" id="ob_district" class="form-control" placeholder="उदा. पुणे" required />
                </div>
                <button type="submit" class="btn btn-primary btn-block">तयार करा (Create)</button>
            </form>
        </div>
    `;
    document.body.appendChild(modal);

    document.getElementById('onboardingForm').onsubmit = async (e) => {
        e.preventDefault();
        const name = document.getElementById('ob_name').value.trim();
        const city = document.getElementById('ob_city').value.trim();
        const district = document.getElementById('ob_district').value.trim();
        const join_code = Math.random().toString(36).substring(2, 8).toUpperCase();

        const { data: mandal, error } = await db.from('mandals').insert({
            name, city, district, join_code, created_by: currentUser.id
        }).select().single();

        if (error) {
            showToast(error.message, 'error');
            return;
        }

        // Initialize Defaults
        await db.rpc('setup_mandal_defaults', { p_mandal_id: mandal.id, p_user_id: currentUser.id });

        // Create default Festival
        await db.from('festivals').insert({
            mandal_id: mandal.id,
            name: `Ganeshotsav ${new Date().getFullYear()}`,
            festival_type: 'Ganesh',
            year: new Date().getFullYear(),
            start_date: new Date().toISOString().split('T')[0],
            end_date: new Date().toISOString().split('T')[0],
            is_active: true
        });

        showToast("मंडळ यशस्वीरित्या तयार झाले!");
        localStorage.setItem('selected_mandal_id', mandal.id);
        modal.remove();
        window.location.reload();
    };
}
