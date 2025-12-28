// infinito/js/auth.js
const supabaseUrl = 'https://frluxcthpwhkxoiygihn.supabase.co';
const supabaseKey = 'sb_publishable_fiwkSgrbFrQjownPSGTbMw_9gTPeRoP';
const supabaseClient = supabasejs.createClient(supabaseUrl, supabaseKey);

// Función para registrarte o iniciar sesión (Supabase lo hace simple)
async function iniciarSesion(email, password) {
    const { data, error } = await supabaseClient.auth.signInWithPassword({
        email: email,
        password: password,
    });

    if (error) alert("Error: " + error.message);
    else window.location.reload(); // Recarga para ver el dashboard
}