import DCFModule from '../components/DCFModule';

const Index = () => {
  const handleValueChange = (price: number) => {
    // eslint-disable-next-line no-console
    console.log('Intrinsic value updated:', price);
  };

  return (
    <DCFModule 
      ticker="SAMPLE" 
      onValueChange={handleValueChange}
    />
  );
};

export default Index;
