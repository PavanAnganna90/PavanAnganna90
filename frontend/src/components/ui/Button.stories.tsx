import { ChevronRightIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Button } from './Button';

const meta: Meta<typeof Button> = {
  title: 'UI/Button',
  component: Button,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'A versatile button component with multiple variants, sizes, and icon support.',
      },
    },
  },
  argTypes: {
    variant: {
      control: 'select',
      options: [
        'default',
        'destructive',
        'outline',
        'secondary',
        'ghost',
        'link',
        'primary',
        'danger',
        'success',
      ],
      description: 'The visual style variant of the button',
    },
    size: {
      control: 'select',
      options: ['default', 'sm', 'lg', 'icon', 'xs', 'md', 'xl'],
      description: 'The size of the button',
    },
    leftIcon: {
      control: false,
      description: 'Icon to display on the left side of the button',
    },
    rightIcon: {
      control: false,
      description: 'Icon to display on the right side of the button',
    },
    fullWidth: {
      control: 'boolean',
      description: 'Whether the button should take the full width of its container',
    },
    isLoading: {
      control: 'boolean',
      description: 'Whether the button is in a loading state',
    },
    disabled: {
      control: 'boolean',
      description: 'Whether the button is disabled',
    },
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

// Basic button variants
export const Default: Story = {
  args: {
    children: 'Button',
  },
};

export const Primary: Story = {
  args: {
    children: 'Primary Button',
    variant: 'primary',
  },
};

export const Destructive: Story = {
  args: {
    children: 'Delete',
    variant: 'destructive',
  },
};

export const Outline: Story = {
  args: {
    children: 'Outline Button',
    variant: 'outline',
  },
};

export const Secondary: Story = {
  args: {
    children: 'Secondary Button',
    variant: 'secondary',
  },
};

export const Ghost: Story = {
  args: {
    children: 'Ghost Button',
    variant: 'ghost',
  },
};

export const Link: Story = {
  args: {
    children: 'Link Button',
    variant: 'link',
  },
};

export const Success: Story = {
  args: {
    children: 'Success Button',
    variant: 'success',
  },
};

export const Danger: Story = {
  args: {
    children: 'Danger Button',
    variant: 'danger',
  },
};

// Size variants
export const Small: Story = {
  args: {
    children: 'Small Button',
    size: 'sm',
  },
};

export const Large: Story = {
  args: {
    children: 'Large Button',
    size: 'lg',
  },
};

export const ExtraSmall: Story = {
  args: {
    children: 'XS',
    size: 'xs',
  },
};

export const ExtraLarge: Story = {
  args: {
    children: 'Extra Large Button',
    size: 'xl',
  },
};

// Icon variants
export const WithLeftIcon: Story = {
  args: {
    children: 'Add Item',
    leftIcon: <PlusIcon />,
    variant: 'primary',
  },
};

export const WithRightIcon: Story = {
  args: {
    children: 'Continue',
    rightIcon: <ChevronRightIcon />,
    variant: 'outline',
  },
};

export const WithBothIcons: Story = {
  args: {
    children: 'Process',
    leftIcon: <PlusIcon />,
    rightIcon: <ChevronRightIcon />,
    variant: 'secondary',
  },
};

export const IconOnly: Story = {
  args: {
    leftIcon: <PlusIcon />,
    size: 'icon',
    variant: 'outline',
    'aria-label': 'Add item',
  },
};

// State variants
export const Loading: Story = {
  args: {
    children: 'Loading...',
    isLoading: true,
    variant: 'primary',
  },
};

export const Disabled: Story = {
  args: {
    children: 'Disabled Button',
    disabled: true,
  },
};

export const FullWidth: Story = {
  args: {
    children: 'Full Width Button',
    fullWidth: true,
    variant: 'primary',
  },
  parameters: {
    layout: 'padded',
  },
};

// Interactive examples
export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-4">
      <Button variant="default">Default</Button>
      <Button variant="primary">Primary</Button>
      <Button variant="destructive">Destructive</Button>
      <Button variant="outline">Outline</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="link">Link</Button>
      <Button variant="success">Success</Button>
      <Button variant="danger">Danger</Button>
    </div>
  ),
};

export const AllSizes: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <Button size="xs">XS</Button>
      <Button size="sm">Small</Button>
      <Button size="default">Default</Button>
      <Button size="lg">Large</Button>
      <Button size="xl">XL</Button>
    </div>
  ),
};

export const IconButtons: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <Button leftIcon={<PlusIcon />} aria-label="Add item" variant="primary" size="sm">
        Add Item
      </Button>
      <Button leftIcon={<TrashIcon />} aria-label="Delete item" variant="danger" size="md">
        Delete Item
      </Button>
      <Button leftIcon={<ChevronRightIcon />} aria-label="Next" variant="outline" size="lg">
        Continue
      </Button>
    </div>
  ),
};

export const ButtonGroup: Story = {
  render: () => (
    <div className="flex items-center">
      <Button variant="outline" className="rounded-r-none border-r-0">
        Left
      </Button>
      <Button variant="outline" className="rounded-none border-r-0">
        Center
      </Button>
      <Button variant="outline" className="rounded-l-none">
        Right
      </Button>
    </div>
  ),
};

export const ButtonGroupVertical: Story = {
  render: () => (
    <div className="flex flex-col items-start">
      <Button variant="outline" className="rounded-b-none border-b-0 w-24">
        Top
      </Button>
      <Button variant="outline" className="rounded-none border-b-0 w-24">
        Middle
      </Button>
      <Button variant="outline" className="rounded-t-none w-24">
        Bottom
      </Button>
    </div>
  ),
};

export const LoadingStates: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <Button isLoading variant="primary">
        Loading...
      </Button>
      <Button isLoading variant="outline">
        Processing...
      </Button>
      <Button isLoading variant="secondary">
        Saving...
      </Button>
    </div>
  ),
};

export const DisabledStates: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <Button disabled variant="primary">
        Disabled Primary
      </Button>
      <Button disabled variant="outline">
        Disabled Outline
      </Button>
      <Button disabled variant="secondary">
        Disabled Secondary
      </Button>
    </div>
  ),
};
