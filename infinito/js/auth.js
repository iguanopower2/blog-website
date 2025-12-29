// infinito/js/auth.js
const supabaseUrl = 'https://frluxcthpwhkxoiygihn.supabase.co';
const supabaseKey = 'sb_publishable_fiwkSgrbFrQjownPSGTbMw_9gTPeRoP';

// Esta variable será global y la usarán los demás archivos
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

async function iniciarSesion(email, password) {
    const { data, error } = await supabaseClient.auth.signInWithPassword({
        email: email,
        password: password,
    });

    if (error) alert("Error: " + error.message);
    else window.location.reload();
}