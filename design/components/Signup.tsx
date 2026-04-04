import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles, Upload } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface SignupProps {
  onSignup: (user: any) => void;
  onNavigateToLogin: () => void;
}

export function Signup({ onSignup, onNavigateToLogin }: SignupProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Simulate signup
    if (name && email && password) {
      onSignup({ 
        name, 
        email, 
        avatar: avatarPreview || 'https://github.com/shadcn.png' 
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="flex items-center space-x-2 text-primary">
              <Sparkles className="h-8 w-8" />
              <span className="font-bold text-2xl tracking-tight">TexAI</span>
            </div>
          </div>
          <CardTitle className="text-2xl">Create an account</CardTitle>
          <CardDescription>
            Enter your information to get started
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="flex flex-col items-center justify-center space-y-4 mb-6">
              <Avatar className="h-24 w-24 border-2 border-primary/20">
                <AvatarImage src={avatarPreview || ''} />
                <AvatarFallback className="bg-muted text-muted-foreground text-2xl">
                  {name ? name.charAt(0).toUpperCase() : 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="relative">
                <input 
                  type="file" 
                  id="avatar" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={handleAvatarChange}
                />
                <Label 
                  htmlFor="avatar" 
                  className="cursor-pointer flex items-center justify-center px-4 py-2 border border-input bg-background hover:bg-accent hover:text-accent-foreground rounded-md text-sm font-medium transition-colors"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Avatar
                </Label>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input 
                id="name" 
                placeholder="John Doe" 
                required 
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="m@example.com" 
                required 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input 
                id="password" 
                type="password" 
                required 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button type="submit" className="w-full">Create account</Button>
            <div className="text-sm text-center text-muted-foreground">
              Already have an account?{' '}
              <button 
                type="button" 
                onClick={onNavigateToLogin}
                className="text-primary hover:underline font-medium"
              >
                Login
              </button>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
