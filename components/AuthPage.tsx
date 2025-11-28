
import React, { useState } from 'react';
import { Mail, Lock, User as UserIcon, AlertTriangle, CheckCircle } from 'lucide-react';

const PrimaryButton = ({ children, onClick, type = 'button', disabled = false }: { children?: React.ReactNode, onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void, type?: 'button' | 'submit', disabled?: boolean }) => (
    <button
        type={type}
        onClick={onClick}
        disabled={disabled}
        className="w-full inline-flex items-center justify-center px-8 py-3 bg-amber-500 text-gray-900 font-bold rounded-lg hover:bg-amber-400 focus:ring-4 focus:outline-none focus:ring-amber-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg"
    >
        <div className="flex items-center justify-center gap-2">
            {children}
        </div>
    </button>
);

const InputField = ({ icon, ...props }: { icon: React.ReactNode } & React.InputHTMLAttributes<HTMLInputElement>) => (
    <div className="relative">
        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400">
            {icon}
        </div>
        <input
            {...props}
            className="w-full pl-10 p-3 bg-gray-800/50 border border-gray-700 rounded-md text-white placeholder-gray-500 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors"
        />
    </div>
);

const AuthPage: React.FC<{ onLogin: () => void }> = ({ onLogin }) => {
    const [mode, setMode] = useState<'login' | 'register'>('login');
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const handleToggleMode = () => {
        setMode(mode === 'login' ? 'register' : 'login');
        setError(null);
        setSuccessMessage(null);
        setName('');
        setEmail('');
        setPassword('');
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccessMessage(null);

        const storedUsersRaw = localStorage.getItem('mockUsers');
        const users = storedUsersRaw ? JSON.parse(storedUsersRaw) : [];

        if (mode === 'register') {
            if (!name || !email || !password) {
                setError('All fields are required for registration.');
                return;
            }
            if (password.length < 6) {
                setError('Password must be at least 6 characters long.');
                return;
            }

            const userExists = users.some((user: any) => user.email === email);
            if (userExists) {
                setError('An account with this email already exists. Please log in.');
                return;
            }

            const newUser = { name, email, password };
            const newUsers = [...users, newUser];
            localStorage.setItem('mockUsers', JSON.stringify(newUsers));
            
            setMode('login');
            setName('');
            setEmail('');
            setPassword('');
            setSuccessMessage('Account created successfully! Please log in.');

        } else { // Login mode
            if (!email || !password) {
                setError('Email and password are required.');
                return;
            }
            
            const user = users.find((u: any) => u.email === email);

            if (user && user.password === password) {
                localStorage.setItem('currentUser', JSON.stringify(user));
                onLogin();
            } else {
                setError('Invalid email or password.');
            }
        }
    };

    return (
        <div className="fade-in flex items-center justify-center">
            <div className="w-full max-w-md bg-gray-900/60 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl p-8 space-y-6">
                <div className="text-center">
                    <h2 className="text-3xl font-bold text-white">
                        {mode === 'login' ? 'Welcome Back' : 'Create Your Account'}
                    </h2>
                    <p className="text-gray-400 mt-1">
                        {mode === 'login' ? 'Sign in to continue your fashion journey.' : 'Join us to discover your perfect style.'}
                    </p>
                </div>
                
                {error && (
                    <div className="bg-red-900/50 border border-red-700 text-red-200 px-3 py-2 rounded-lg text-sm flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                        <span>{error}</span>
                    </div>
                )}

                {successMessage && (
                     <div className="bg-green-900/50 border border-green-700 text-green-200 px-3 py-2 rounded-lg text-sm flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 flex-shrink-0 text-green-400" />
                        <span>{successMessage}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    {mode === 'register' && (
                        <InputField
                            icon={<UserIcon size={18} />}
                            type="text"
                            placeholder="Full Name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                        />
                    )}
                    <InputField
                        icon={<Mail size={18} />}
                        type="email"
                        placeholder="Email Address"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                    <InputField
                        icon={<Lock size={18} />}
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                    <div className="pt-2">
                        <PrimaryButton type="submit">
                            {mode === 'login' ? 'Sign In' : 'Create Account'}
                        </PrimaryButton>
                    </div>
                </form>
                
                <div className="text-center">
                    <button onClick={handleToggleMode} className="text-sm text-gray-400 hover:text-white hover:underline transition-colors">
                        {mode === 'login' ? 'Don\'t have an account? Sign up' : 'Already have an account? Sign in'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AuthPage;
