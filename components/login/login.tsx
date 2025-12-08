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

          <CardContent >
          <Tabs 
          value={role}
          //handle the change of tab value, on evey change it updates the state and renders the right content
          onValueChange={(value) => setRole(value as "company" | "trade")} 
          className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value='company' className="flex items-center gap-2">
                  Rectuter
              </TabsTrigger>
              <TabsTrigger value='trade' className="flex items-center gap-2">
                  Trade
              </TabsTrigger>
            </TabsList>


          {/* 
           the content showes based on the selected tabs and it is all within a form that later can be submitted
            */}
        
          <form >
             {/* Company tab */}
            <TabsContent value='company' className="space-y-4 mt-0 ">
            <div className="space-y-2">
                <Label htmlFor="company-email">Email</Label>
                <Input
                  id="company-email"
                  type="email"
                  placeholder="company@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="bg-white"
                />
            </div>

            <div className="space-y-2">
              <Label htmlFor="company-password">Password</Label>
              <Input
                id="company-password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-white"
              />
            </div>

            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700">
              Sign In as Company
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
            </TabsContent>



             {/* Trade tab */}
            <TabsContent value='trade' className="space-y-4 mt-0">

              <div className="space-y-2">
                <Label htmlFor="trade-email">Email</Label>
                <Input
                  id="trade-email"
                  type="email"
                  placeholder="tradesperson@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="bg-white"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="trade-password">Password</Label>
                <Input
                  id="trade-password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="bg-white"
                />
              </div>

              <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700">
                Sign In as Trade
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </TabsContent>


          </form>

          </Tabs>
          </CardContent>

          
      </Card>
    </div>
  );
}
