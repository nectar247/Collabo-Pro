import { Percent, ShoppingBag, Tag } from "lucide-react";
import * as LucideIcons from 'lucide-react';
import {
    Heart,
    Users,
    Shield,
    Award,
    Eye,
    Target,
    Home,
    Bell,
    Bookmark,
    Calendar,
    Camera,
    CheckCircle,
    Clipboard,
    Clock,
    Cloud,
    Code,
    Database,
    FileText,
    Gift,
    Globe,
    Inbox,
    Key,
    Layers,
    Lightbulb,
    Lock,
    Mail,
    MapPin,
    MessageCircle,
    Monitor,
    Package,
    Paperclip,
    PenTool,
    Phone,
    PlusCircle,
    Settings,
    ShoppingCart,
    Star,
    ThumbsUp,
    Trash,
    UserCheck,
    Wifi,
    // More meaningful category icons
    Shirt,
    Smartphone,
    Utensils,
    Plane,
    Dumbbell,
    Sparkles,
    Sofa,
    Laptop,
    Watch,
    Footprints,
    Baby,
    PawPrint,
    Car,
    Book,
    Gamepad2,
    Music,
    Palette,
    Trees,
    Briefcase,
    GraduationCap,
    Pizza,
    Coffee,
    Wine,
    Flower2,
    Glasses,
    Gem,
    Ticket,
    Film,
    Headphones
} from "lucide-react";

const icons = {
    Heart,
    Users,
    Shield,
    Award,
    Eye,
    Target,
    Home,
    Bell,
    Bookmark,
    Calendar,
    Camera,
    CheckCircle,
    Clipboard,
    Clock,
    Cloud,
    Code,
    Database,
    FileText,
    Gift,
    Globe,
    Inbox,
    Key,
    Layers,
    Lightbulb,
    Lock,
    Mail,
    MapPin,
    MessageCircle,
    Monitor,
    Package,
    Paperclip,
    PenTool,
    Phone,
    PlusCircle,
    Settings,
    ShoppingCart,
    Star,
    ThumbsUp,
    Trash,
    UserCheck,
    Wifi,
    // More meaningful category icons
    Shirt,
    Smartphone,
    Utensils,
    Plane,
    Dumbbell,
    Sparkles,
    Sofa,
    Laptop,
    Watch,
    Footprints,
    Baby,
    PawPrint,
    Car,
    Book,
    Gamepad2,
    Music,
    Palette,
    Trees,
    Briefcase,
    GraduationCap,
    Pizza,
    Coffee,
    Wine,
    Flower2,
    Glasses,
    Gem,
    Ticket,
    Film,
    Headphones
};

// Helper function to get category color
function getCategoryColor(category: string): string {
    // Ensure category is non-empty and handle lowercase conversion
    if (!category || category.length === 0) return "from-primary to-primary-dark";
    const alp = category.toLowerCase()[0];
  
    // Use switch for explicit cases
    switch (alp) {
        case 'a':
            return "from-[#FF6B6B] to-[#FF8E8E]";
        case 'b':
            return "from-[#4E6FFF] to-[#6B8AFF]";
        case 'c':
            return "from-[#FFB13B] to-[#FFD03B]";
        case 'd':
            return "from-[#FF6B6B] to-[#FF8E8E]";
        case 'e':
            return "from-[#4E6FFF] to-[#6B8AFF]";
        case 'f':
            return "from-[#FFB13B] to-[#FFD03B]";
        case 'g':
            return "from-[#FF6B6B] to-[#FF8E8E]";
        case 'h':
            return "from-[#4E6FFF] to-[#6B8AFF]";
        case 'i':
            return "from-[#FFB13B] to-[#FFD03B]";
        case 'j':
            return "from-[#FF6B6B] to-[#FF8E8E]";
        case 'k':
            return "from-[#4E6FFF] to-[#6B8AFF]";
        case 'l':
            return "from-[#FFB13B] to-[#FFD03B]";
        case 'm':
            return "from-[#FF6B6B] to-[#FF8E8E]";
        case 'n':
            return "from-[#4E6FFF] to-[#6B8AFF]";
        case 'o':
            return "from-[#FFB13B] to-[#FFD03B]";
        case 'p':
            return "from-[#FF6B6B] to-[#FF8E8E]";
        case 'q':
            return "from-[#4E6FFF] to-[#6B8AFF]";
        case 'r':
            return "from-[#FFB13B] to-[#FFD03B]";
        case 's':
            return "from-[#FF6B6B] to-[#FF8E8E]";
        case 't':
            return "from-[#4E6FFF] to-[#6B8AFF]";
        case 'u':
            return "from-[#FFB13B] to-[#FFD03B]";
        case 'v':
            return "from-[#FF6B6B] to-[#FF8E8E]";
        case 'w':
            return "from-[#4E6FFF] to-[#6B8AFF]";
        case 'x':
            return "from-[#FFB13B] to-[#FFD03B]";
        case 'y':
            return "from-[#FF6B6B] to-[#FF8E8E]";
        case 'z':
            return "from-[#FFB13B] to-[#FFD03B]";
        default:
            return "from-primary to-primary-dark";
    }
}

// Helper function to get icon component
function DynamicIcon({ name, color = 'text-white' }: { name: string, color?: string }) {
    const IconComponent = (LucideIcons as any)[name];
    if (!IconComponent) {
        console.warn(`Icon ${name} not found`);
        return null;
    }
    return <IconComponent className={`h-6 w-6 ${color}`} />;
}

const renderIconSelect = (currentIcon: string, onChange: (icon: string) => void) => (
    <select
        value={currentIcon}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-2 bg-gray-800 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
        required
    >
        <option value="">-Select Icon-</option>
        {Object.keys(icons).map((iconName) => (
            <option key={iconName} value={iconName}>
                {iconName}
            </option>
        ))}
    </select>
);

const handleSearchClick = (router: any, search: string) => {
    router.push(`/search?q=${encodeURIComponent(search)}`);
};

const DealsLabel = {
    GetCode: 'Get Code',
    GetDeals: 'Get Deal',
    GetReward: 'Get Reward',
} as any;

const truncateText = (text: string, maxLength: number) => {
    if (text && text.length > maxLength) {
        return text.substring(0, maxLength) + "...";
    }
    return text;
};

const reformatDate = (date: any) => {
    return new Date(date).toLocaleDateString(
        'en-GB', { day: 'numeric', month: 'short', year: 'numeric', }
    );
};

export {
    getCategoryColor,
    DynamicIcon,
    renderIconSelect,
    handleSearchClick,
    DealsLabel,
    truncateText,
    reformatDate,
}