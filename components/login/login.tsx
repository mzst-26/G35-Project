import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

// UI primitives
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Building2, Wrench, ArrowRight, Shield } from 'lucide-react';

interface LoginScreenProps {
  // the parent can react to login for example store user or set auth state
  onLogin: (role: 'company' | 'trade') => void;
}

export default function LoginScreen({ onLogin }: LoginScreenProps) {
  const navigate = useNavigate();

  // local form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'company' | 'trade'>('company');

  // for now, a dummy submit handler (I will change this later)
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // I will add real backend logic later
    onLogin(role);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-900 ">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Welcome Back</CardTitle>
          <CardDescription>Sign in to your account to continue</CardDescription>
        </CardHeader>

          <CardContent>
          <Tabs 
          value={role}
          //handle the change of tab value, on evey change it updates the state and renders the right content
          onValueChange={(value) => setRole(value as "company" | "trade")} 
          className="w-full"
          >
            <TabsList>
              <TabsTrigger value='company'>
                  Rectuter
              </TabsTrigger>
              <TabsTrigger value='trade'>
                  Trade
              </TabsTrigger>
            </TabsList>
          </Tabs>
          </CardContent>

          
      </Card>
    </div>
  );
}
