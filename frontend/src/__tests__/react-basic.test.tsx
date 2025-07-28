/**
 * Basic React Test - Debug React environment
 */
import React from 'react';
import { render, screen } from '@testing-library/react';

// Very simple component to test React
const SimpleComponent = () => {
  return <div>Hello React</div>;
};

describe('React Environment Test', () => {
  test('should render a simple React component', () => {
    render(<SimpleComponent />);
    expect(screen.getByText('Hello React')).toBeInTheDocument();
  });

  test('should have React available', () => {
    expect(React).toBeDefined();
    expect(React.createElement).toBeInstanceOf(Function);
  });

  test('should support JSX', () => {
    const element = <div>JSX works</div>;
    expect(element).toBeDefined();
    expect(element.type).toBe('div');
  });
});