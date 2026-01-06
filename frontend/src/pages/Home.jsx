import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Heart, Shield, TrendingUp, Users, Globe, ArrowRight, CheckCircle } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import CampaignCard from '../components/CampaignCard';
import { getCampaigns, getCategories } from '../services/api';

const Home = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [featuredCampaigns, setFeaturedCampaigns] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [campaignsRes, categoriesRes] = await Promise.all([
          getCampaigns({ limit: 3 }),
          getCategories()
        ]);
        setFeaturedCampaigns(campaignsRes.data || []);
        setCategories(categoriesRes.data || []);
      } catch (error) {
        console.error('Failed to load data:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const stats = [
    { label: 'Students Funded', value: '2,500+', icon: Users },
    { label: 'Total Raised', value: '$12M+', icon: TrendingUp },
    { label: 'Countries Reached', value: '45+', icon: Globe },
    { label: 'Success Rate', value: '94%', icon: CheckCircle }
  ];

  const handleSearch = (e) => {
    e.preventDefault();
    navigate(`/browse?search=${searchQuery}`);
  };

  const categoryIcons = {
    tuition: '🎓',
    books: '📚',
    laptop: '💻',
    housing: '🏠',
    travel: '✈️',
    emergency: '🚨'
  };

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-50 via-white to-blue-50 py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center space-x-2 bg-blue-100 text-blue-700 px-4 py-2 rounded-full mb-6 text-sm font-medium">
              <Shield className="h-4 w-4" />
              <span>Verified Student Profiles Only</span>
            </div>
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
              Empowering Students,
              <br />
              <span className="bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
                Transforming Futures
              </span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 leading-relaxed">
              Connect with verified students worldwide who need support to complete their education.
              Every contribution creates lasting impact.
            </p>

            {/* Search Bar */}
            <form onSubmit={handleSearch} className="max-w-2xl mx-auto mb-8">
              <div className="flex gap-3">
                <div className="flex-1 relative">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Search by country, field of study, or student name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-12 py-6 text-lg"
                  />
                </div>
                <Button type="submit" size="lg" className="px-8 bg-blue-600 hover:bg-blue-700">
                  Search
                </Button>
              </div>
            </form>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                onClick={() => navigate('/browse')}
                className="bg-blue-600 hover:bg-blue-700 text-lg px-8 py-6"
              >
                <Heart className="mr-2 h-5 w-5" />
                Browse Campaigns
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => navigate('/create-campaign')}
                className="text-lg px-8 py-6 border-2"
              >
                Start Your Campaign
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <div key={index} className="text-center">
                  <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-lg mb-3">
                    <Icon className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="text-3xl font-bold text-gray-900 mb-1">{stat.value}</div>
                  <div className="text-sm text-gray-600">{stat.label}</div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Featured Campaigns */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Featured Campaigns</h2>
            <p className="text-lg text-gray-600">Support verified students making a difference</p>
          </div>
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="grid md:grid-cols-3 gap-8 mb-8">
              {featuredCampaigns.map((campaign) => (
                <CampaignCard key={campaign.campaign_id} campaign={campaign} />
              ))}
            </div>
          )}
          <div className="text-center">
            <Button
              size="lg"
              variant="outline"
              onClick={() => navigate('/browse')}
              className="border-2"
            >
              View All Campaigns
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Support By Category</h2>
            <p className="text-lg text-gray-600">Choose the type of support you&apos;d like to provide</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => navigate(`/browse?category=${category.id}`)}
                className="p-6 bg-gradient-to-br from-blue-50 to-white border-2 border-blue-100 rounded-xl hover:border-blue-300 hover:shadow-lg transition-all duration-300 group"
              >
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-lg mb-3 group-hover:bg-blue-200 transition-colors">
                    <div className="text-blue-600 text-2xl">{categoryIcons[category.id] || '📚'}</div>
                  </div>
                  <div className="font-semibold text-gray-900">{category.name}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-gradient-to-br from-blue-600 to-blue-800 text-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">How FundEd Works</h2>
            <p className="text-xl text-blue-100">Simple, transparent, and secure</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 backdrop-blur rounded-full mb-4">
                <Shield className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-bold mb-3">Verification</h3>
              <p className="text-blue-100">
                Students submit their profiles with documents. Our admin team verifies every application to ensure authenticity.
              </p>
            </div>
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 backdrop-blur rounded-full mb-4">
                <Heart className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-bold mb-3">Support</h3>
              <p className="text-blue-100">
                Donors browse verified campaigns and contribute any amount. Track progress and see real-time impact.
              </p>
            </div>
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 backdrop-blur rounded-full mb-4">
                <TrendingUp className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-bold mb-3">Impact</h3>
              <p className="text-blue-100">
                Students receive funds and complete their education. They share their journey and give back to the community.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
